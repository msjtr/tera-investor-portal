/**
 * NotificationService – المحرك المركزي للإشعارات (الإصدار النهائي المُحسَّن)
 * - يحفظ الإشعار في DB باستخدام withAuth
 * - يرسل Push عبر Edge Function
 * - يسجل النتيجة في notification_logs
 * - يحدّث الواجهة تلقائياً
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
          console.warn('⏳ [NotificationService] No active session');
          return null;
        }
        console.log('✅ [NotificationService] Session active for user:', session.user.id);
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

    // ─── إرسال إشعار (الوظيفة الرئيسية) ───
    async send({ userId, title, body, type = 'system', priority = 'normal', data = {} }) {
      if (!title) {
        throw new Error('title is required');
      }

      console.log('📤 [NotificationService] Sending notification:', { userId, title });

      // تنفيذ العملية داخل withAuth
      const result = await this._withAuth(async (session) => {
        const sb = this._getSupabaseClient();
        if (!sb) throw new Error('Supabase client not available');

        // استخدام userId من الجلسة إذا لم يتم تمريره
        const targetUserId = userId || session.user.id;
        console.log('👤 Target user ID:', targetUserId);

        // 1. حفظ الإشعار في قاعدة البيانات
        const notificationData = {
          user_id: targetUserId,
          title,
          body: body || '',
          type: type || 'system',
          priority: priority || 'normal',
          status: 'unread',
          is_read: false,
          data: data || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('💾 Saving notification to DB:', notificationData);

        const { data: notification, error: insertError } = await sb
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Failed to save notification:', insertError);
          throw insertError;
        }

        console.log('✅ Notification saved successfully:', notification.id);

        // 2. إظهار Toast
        this._showToast(notification);

        // 3. إرسال حدث محلي لتحديث الواجهة
        this._dispatchLocalEvent(notification);

        // 4. تحديث الـ Cache و UI مباشرة
        this._updateUI(notification);

        // 5. إرسال Push عبر Edge Function (غير متزامن)
        this._sendPushViaEdge(notification).catch(err => {
          console.warn('⚠️ Push sending failed (logged):', err);
        });

        return notification;
      });

      if (result === null) {
        // المستخدم غير مسجل
        const error = new Error('User not authenticated. Please sign in to send notifications.');
        error.code = 'UNAUTHENTICATED';
        throw error;
      }

      return result;
    }

    // ─── تحديث الواجهة مباشرة ───
    _updateUI(notification) {
      try {
        // إضافة إلى NotificationCache إن وجد
        if (window.NotificationCache && typeof window.NotificationCache.add === 'function') {
          window.NotificationCache.add(notification);
          console.log('✅ Notification added to cache');
        }

        // إضافة إلى NotificationManager إن وجد
        if (window.NotificationManager && typeof window.NotificationManager.addNotification === 'function') {
          window.NotificationManager.addNotification(notification);
          console.log('✅ Notification added to manager');
        }

        // تحديث UI
        if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
          window.NotificationUI.refresh();
          console.log('✅ UI refreshed');
        }

        // تحديث العداد
        if (window.NotificationUI && typeof window.NotificationUI.updateStats === 'function') {
          const cache = window.NotificationCache;
          if (cache && typeof cache.getStats === 'function') {
            window.NotificationUI.updateStats(cache.getStats());
          }
        }
      } catch (e) {
        console.warn('⚠️ UI update failed:', e);
      }
    }

    // ─── عرض Toast ───
    _showToast(notification) {
      try {
        if (window.toastManager && typeof window.toastManager.show === 'function') {
          window.toastManager.show(notification.title, notification.body, notification.type);
          return;
        }
      } catch (e) {
        console.warn('⚠️ Toast manager not available');
      }

      // Toast احتياطي
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #028090;
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
      try {
        document.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
        console.log('📡 Dispatched new-notification event');
      } catch (e) {
        console.warn('⚠️ Event dispatch failed:', e);
      }
    }

    // ─── إرسال Push عبر Edge Function ───
    async _sendPushViaEdge(notification) {
      const sb = this._getSupabaseClient();
      if (!sb) {
        console.warn('⚠️ No Supabase client for push');
        return;
      }

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
        console.log('📨 Sending push to playerId:', playerId);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          console.log('✅ Push sent successfully:', result.notificationId);
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

      await this._withAuth(async (session) => {
        const targetUserId = userId || session.user.id;

        const { error } = await sb.from('notification_logs').insert({
          notification_id: notificationId,
          user_id: targetUserId,
          status,
          error_message: errorMessage,
          message_id: messageId,
          sent_at: new Date().toISOString()
        });

        if (error) {
          console.warn('⚠️ Failed to log:', error.message);
        } else {
          console.log(`📝 Logged notification ${notificationId}: ${status}`);
        }
        return true;
      }).catch(e => {
        console.warn('⚠️ Logging failed (ignored):', e.message);
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
        console.log(`📥 Fetched ${data?.length || 0} notifications`);
        return data;
      }) || [];
    }

    // ─── تحديث حالة الإشعار ───
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
        console.log(`✅ Notification ${notificationId} marked as read`);
        return true;
      }) || false;
    }
  }

  // ─── تصدير الكائن العام ───
  window.NotificationService = new NotificationServiceClass();
  console.log('✅ NotificationService loaded (with UI sync)');
})();
