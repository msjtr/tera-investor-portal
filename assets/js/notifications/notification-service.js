/**
 * NotificationService – المحرك المركزي للإشعارات
 * المسار: assets/js/notifications/notification-service.js
 */
(function() {
  'use strict';

  class NotificationServiceClass {
    constructor() {
      this.supabase = null; // سيتم تعيينه عند التهيئة
    }

    // تهيئة الخدمة (تُستدعى مرة واحدة بعد تحميل supabase)
    async init(supabaseClient) {
      this.supabase = supabaseClient;
      console.log('✅ NotificationService initialized');
    }

    /**
     * إرسال إشعار – المدخل الوحيد
     * @param {Object} params
     * @param {string} params.userId - معرف المستخدم
     * @param {string} params.title - عنوان الإشعار
     * @param {string} params.body - نص الإشعار
     * @param {string} [params.type='system'] - نوع الإشعار
     * @param {string} [params.priority='normal'] - الأولوية
     * @param {Object} [params.data={}] - بيانات إضافية (مثل action_url)
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

      // 2. بث الإشعار عبر Realtime (سيصل إلى جميع المشتركين)
      //    هذا يحدث تلقائياً عند الإدراج في جدول notifications إذا كانت القناة مفعّلة.
      //    لكن سنقوم أيضاً بتشغيل حدث مخصص للتوست المحلي.
      this._showToast(notification);
      this._dispatchLocalEvent(notification);

      // 3. إرسال Push عبر Edge Function (التي بدورها تستخدم OneSignal)
      this._sendPushViaEdge(notification).catch(err => {
        console.warn('⚠️ Push sending failed, logged:', err);
      });

      return notification;
    }

    // --- داخلي: عرض Toast ---
    _showToast(notification) {
      // استخدام مكتبة toast أو تنفيذ بسيط
      if (window.toastManager) {
        window.toastManager.show(notification.title, notification.body, notification.type);
      } else {
        // تنفيذ بسيط كاحتياط
        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${notification.priority || 'normal'}`;
        toast.innerText = `${notification.title}: ${notification.body}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      }
    }

    // --- داخلي: حدث محلي لتحديث الواجهة ---
    _dispatchLocalEvent(notification) {
      document.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    }

    // --- داخلي: استدعاء Edge Function لإرسال push ---
    async _sendPushViaEdge(notification) {
      if (!this.supabase) return;
      const { data, error } = await this.supabase.functions.invoke('send-push', {
        body: { notification }
      });
      if (error) {
        // تسجيل الفشل في السجل
        await this._log(notification.id, notification.user_id, 'failed', error.message);
        throw error;
      }
      // تسجيل النجاح
      await this._log(notification.id, notification.user_id, 'success', null, data?.messageId);
    }

    // --- تسجيل عملية الإرسال ---
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

  // تعريض Singleton
  window.NotificationService = new NotificationServiceClass();
})();
