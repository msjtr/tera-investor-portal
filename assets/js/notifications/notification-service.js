/**
 * NotificationService – المحرك المركزي للإشعارات
 * المسار: assets/js/notifications/notification-service.js
 */
(function() {
  'use strict';

  class NotificationServiceClass {
    constructor() {
      this.supabase = null;
    }

    async init(supabaseClient) {
      this.supabase = supabaseClient;
      console.log('✅ NotificationService initialized');
    }

    /**
     * إرسال إشعار – المدخل الوحيد
     */
    async send({ userId, title, body, type = 'system', priority = 'normal', data = {} }) {
      if (!this.supabase) throw new Error('NotificationService not initialized');
      if (!userId || !title) throw new Error('userId and title are required');

      // 1. حفظ الإشعار في قاعدة البيانات
      const { data: notification, error: insertError } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          body,
          type,
          priority,
          status: 'unread',
          data,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to save notification:', insertError);
        throw insertError;
      }

      console.log('✅ Notification saved:', notification.id);

      // 2. إظهار Toast + حدث محلي
      this._showToast(notification);
      this._dispatchLocalEvent(notification);

      // 3. إرسال Push عبر Edge Function وتسجيل النتيجة
      this._sendPushViaEdge(notification).catch(err => {
        console.warn('⚠️ Push sending failed (logged):', err);
      });

      return notification;
    }

    _showToast(notification) {
      if (window.toastManager) {
        window.toastManager.show(notification.title, notification.body, notification.type);
      } else {
        // Fallback بسيط
        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${notification.priority || 'normal'}`;
        toast.innerText = `${notification.title}: ${notification.body}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      }
    }

    _dispatchLocalEvent(notification) {
      document.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    }

    async _sendPushViaEdge(notification) {
      if (!this.supabase) return;

      // استدعاء Edge Function
      const { data: response, error } = await this.supabase.functions.invoke(
        'send-push-notification',
        {
          body: {
            userId: notification.user_id,
            title: notification.title,
            body: notification.body,
            url: notification.data?.action_url || null,
            data: notification.data || {},
            silent: false
          }
        }
      );

      if (error) {
        // تسجيل فشل الاستدعاء نفسه
        await this._log(notification.id, notification.user_id, 'failed', error.message);
        throw error;
      }

      if (response?.success) {
        await this._log(notification.id, notification.user_id, 'success', null, response.notificationId);
      } else {
        const errorMsg = response?.error || 'Unknown OneSignal error';
        await this._log(notification.id, notification.user_id, 'failed', errorMsg);
      }
    }

    async _log(notificationId, userId, status, errorMessage = null, messageId = null) {
      if (!this.supabase) return;
      await this.supabase.from('notification_logs').insert({
        notification_id: notificationId,
        user_id: userId,
        status,
        error_message: errorMessage,
        message_id: messageId,
        sent_at: new Date().toISOString()
      });
    }
  }

  window.NotificationService = new NotificationServiceClass();
})();
