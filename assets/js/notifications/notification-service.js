/**
 * NotificationService – المحرك المركزي للإشعارات (الإصدار النهائي)
 * - يحفظ الإشعار في DB باستخدام withAuth
 * - يرسل Push عبر Edge Function مباشرة
 * - يسجل النتيجة في notification_logs
 * - متوافق مع نظام RLS والمصادقة
 */
(function() {
  'use strict';

  class NotificationServiceClass {
    constructor() {
      this.supabase = null;
    }

    // ─── دالة مساعدة للحصول على Supabase Client ───
    _getSupabaseClient() {
      if (this.supabase) return this.supabase;
      if (window.teraSupabase) return window.teraSupabase;
      if (window.Support?.getSupabase) return window.Support.getSupabase();
      if (window.supabase) return window.supabase;
      return null;
    }

    // ─── دالة withAuth الموحدة ───
    async _withAuth(callback) {
      const sb = this._getSupabaseClient();
      if (!sb) {
        console.warn('⚠️ [NotificationService] Supabase client not available');
        return null;
      }

      try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error || !session) {
          console.log('⏳ [NotificationService] No active session, skipping request');
          return null;
        }
        return await callback(session);
      } catch (e) {
        console.warn('⚠️ [NotificationService] withAuth error:', e.message);
        return null;
      }
    }

    // ─── التهيئة ───
    async init(supabaseClient) {
      this.supabase = supabaseClient || this._getSupabaseClient();
      console.log('✅ NotificationService initialized');
      return this;
    }

    // ─── إرسال إشعار ───
    async send({ userId, title, body, type = 'system', priority = 'normal', data = {} }) {
      // تحقق من وجود البيانات الأساسية
      if (!title) throw new Error('title is required');

      // تنفيذ العملية داخل withAuth لضمان الجلسة
      const result = await this._withAuth(async (session) => {
        const sb = this._getSupabaseClient();
        if (!sb) throw new Error('Supabase client not available');

        // استخدام userId من الجلسة إذا لم يتم تمريره
        const targetUserId = userId || session.user.id;

        // 1. حفظ الإشعار في قاعدة البيانات
        const { data: notification, error: insertError } = await sb
          .from('notifications')
          .insert({
            user_id: targetUserId,
            title,
            body,
            type,
            priority,
            status: 'unread',
            data: data || {},
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

        // 3. إرسال Push عبر Edge Function (لا ننتظر النتيجة)
        this._sendPushViaEdge(notification).catch(err => {
          console.warn('⚠️ Push sending failed (logged):', err);
        });

        return notification;
      });

      if (result === null) {
        // المستخدم غير مسجل → نلقي خطأ أو نعيد كائن خطأ
        const error = new Error('User not authenticated. Please sign in to send notifications.');
        error.code = 'UNAUTHENTICATED';
        throw error;
      }

      return result;
    }

    // ─── عرض Toast ───
    _showToast(notification) {
      if (window.toastManager) {
        window.toastManager.show(notification.title, notification.body, notification.type);
        return;
      }

      // Toast بسيط كاحتياطي
      const toast = document.createElement('div');
      toast.className = `notification-toast toast-${notification.priority || 'normal'}`;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${notification.priority === 'high' ? '#dc2626' : '#028090'};
        color: #fff;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        z-index: 99999;
        max-width: 400px;
        direction: rtl;
        font-family: 'Tajawal', sans-serif;
        animation: slideUp 0.3s ease;
        border-right: 4px solid #fff;
      `;
      toast.innerHTML = `
        <strong style="display:block;font-size:16px;">${notification.title}</strong>
        <span style="font-size:14px;opacity:0.9;">${notification.body || ''}</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }

    // ─── إرسال حدث محلي ───
    _dispatchLocalEvent(notification) {
      document.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    }

    // ─── إرسال Push عبر Edge Function ───
    async _sendPushViaEdge(notification) {
      const sb = this._getSupabaseClient();
      if (!sb) return;

      // الحصول على playerId
      let playerId = sessionStorage.getItem('onesignal_subscription_id');
      if (!playerId && window.getPlayerId) {
        try {
          playerId = window.getPlayerId();
        } catch (e) {
          console.warn('⚠️ Failed to get playerId:', e);
        }
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

    // ─── تسجيل النتيجة في notification_logs ───
    async _log(notificationId, userId, status, errorMessage = null, messageId = null) {
      const sb = this._getSupabaseClient();
      if (!sb) return;

      // استخدام withAuth للتسجيل
      await this._withAuth(async (session) => {
        // تأكد من أن userId يطابق الجلسة
        const targetUserId = userId || session.user.id;

        await sb.from('notification_logs').insert({
          notification_id: notificationId,
          user_id: targetUserId,
          status,
          error_message: errorMessage,
          message_id: messageId,
          sent_at: new Date().toISOString()
        });
        console.log(`📝 Logged notification ${notificationId}: ${status}`);
        return true;
      }).catch(e => {
        // إذا فشل التسجيل بسبب RLS، نسجل تحذيراً فقط
        if (e.code === '42501' || e.message?.includes('permission denied')) {
          console.warn('⚠️ Failed to log notification (permission denied). Check RLS on notification_logs.');
        } else {
          console.warn('⚠️ Failed to log notification:', e);
        }
      });
    }

    // ─── جلب الإشعارات (دالة مساعدة) ───
    async getNotifications(limit = 50) {
      return await this._withAuth(async (session) => {
        const sb = this._getSupabaseClient();
        if (!sb) return [];

        const { data, error } = await sb
          .from('notifications')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data;
      }) || [];
    }

    // ─── تحديث حالة الإشعار (دالة مساعدة) ───
    async markAsRead(notificationId) {
      return await this._withAuth(async (session) => {
        const sb = this._getSupabaseClient();
        if (!sb) return false;

        const { error } = await sb
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', notificationId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        return true;
      }) || false;
    }
  }

  // ─── تصدير الكائن العام ───
  window.NotificationService = new NotificationServiceClass();
  console.log('✅ NotificationService loaded (with auth support)');
})();
