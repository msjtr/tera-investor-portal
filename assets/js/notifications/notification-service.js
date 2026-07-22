/**
 * NotificationService – المحرك المركزي للإشعارات (الإصدار النهائي المبسط)
 * - يحفظ الإشعار في DB
 * - يرسل Push عبر Edge Function مباشرة (بدون Authorization)
 * - يسجل النتيجة في notification_logs
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

      // 3. إرسال Push عبر Edge Function
      this._sendPushViaEdge(notification).catch(err => {
        console.warn('⚠️ Push sending failed (logged):', err);
      });

      return notification;
    }

    _showToast(notification) {
      if (window.toastManager) {
        window.toastManager.show(notification.title, notification.body, notification.type);
      } else {
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

      // الحصول على playerId (من sessionStorage أو OneSignal API)
      let playerId = sessionStorage.getItem('onesignal_subscription_id');
      if (!playerId && window.getPlayerId) {
        playerId = window.getPlayerId();
      }
      if (!playerId) {
        console.warn('⚠️ No playerId found, push skipped');
        await this._log(notification.id, notification.user_id, 'failed', 'No playerId');
        return;
      }

      const url = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/send-push-notification';
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // لا نرسل Authorization لأن Edge Function لا تشترطه حالياً
          },
          body: JSON.stringify({
            playerIds: [playerId],
            title: notification.title,
            body: notification.body,
            url: notification.data?.action_url || null,
            data: notification.data || {}
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          await this._log(notification.id, notification.user_id, 'failed', errorText);
          throw new Error(`Edge function error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
          await this._log(notification.id, notification.user_id, 'success', null, result.notificationId);
          console.log('✅ Push sent:', result.notificationId);
        } else {
          await this._log(notification.id, notification.user_id, 'failed', result.error || 'Unknown');
        }
      } catch (err) {
        await this._log(notification.id, notification.user_id, 'failed', err.message);
        console.warn('⚠️ Push failed:', err);
      }
    }

    async _log(notificationId, userId, status, errorMessage = null, messageId = null) {
      if (!this.supabase) return;
      try {
        await this.supabase.from('notification_logs').insert({
          notification_id: notificationId,
          user_id: userId,
          status,
          error_message: errorMessage,
          message_id: messageId,
          sent_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('⚠️ Failed to log notification:', e);
        if (e.code === '42501' || e.message?.includes('permission denied')) {
          console.warn('💡 تلميح: عطّل RLS على notification_logs أو أضف سياسة INSERT مناسبة.');
        }
      }
    }
  }

  window.NotificationService = new NotificationServiceClass();
})();
