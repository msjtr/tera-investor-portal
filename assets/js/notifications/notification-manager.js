/**
 * notification-manager.js
 * مدير الإشعارات المتكامل مع دعم RLS و OneSignal
 * يوفر واجهة init ودوال جلب وتحديث
 */

(function() {
  "use strict";

  // ============================================================
  // 1. دالة withAuth (لضمان الجلسة قبل أي طلب)
  // ============================================================
  async function withAuth(callback) {
    const sb = window.teraSupabase || window.supabase;
    if (!sb) {
      console.warn('⚠️ [NotificationManager] Supabase غير متاح');
      return null;
    }

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error || !session) {
        console.log('⏳ [NotificationManager] المستخدم غير مسجل، سيتم تخطي الطلب');
        return null;
      }
      return await callback(session);
    } catch (e) {
      console.warn('⚠️ [NotificationManager] خطأ في التحقق من الجلسة:', e);
      return null;
    }
  }

  // ============================================================
  // 2. الدوال الأساسية (دون تغيير)
  // ============================================================
  async function fetchUnreadNotifications() {
    return withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('status', 'unread')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    });
  }

  async function fetchNotifications(filters = {}, limit = 20) {
    return withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
      let query = sb
        .from('notifications')
        .select('*')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  async function markAsRead(notificationId) {
    return withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
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
    });
  }

  async function markAllAsRead() {
    return withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
      const { error } = await sb
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      if (error) throw error;
      return true;
    });
  }

  async function getUnreadCount() {
    const result = await withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
      const { count, error } = await sb
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false)
        .eq('deleted_at', null);
      if (error) throw error;
      return count;
    });
    return result || 0;
  }

  // ============================================================
  // 3. دالة init المطلوبة من support-notifications.js
  // ============================================================
  async function init(options = {}) {
    console.log('🔔 [NotificationManager] جاري تهيئة نظام الإشعارات...');
    try {
      // يمكننا هنا إضافة أي إعدادات إضافية (مثل تسجيل المستخدم في OneSignal)
      // لكن الأساس هو التأكد من أن Supabase جاهز
      const sb = window.teraSupabase || window.supabase;
      if (!sb) {
        throw new Error('Supabase غير معرّف');
      }

      // التحقق من الجلسة (اختياري)
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        console.log('✅ [NotificationManager] المستخدم مسجل دخول:', session.user.id);
        // يمكننا ربط OneSignal هنا إذا أردنا
      } else {
        console.log('⏳ [NotificationManager] لا توجد جلسة، سيتم تأجيل الطلبات');
      }

      // إرجاع الكائن manager نفسه للاستخدام
      return window.NotificationManager;
    } catch (e) {
      console.error('❌ [NotificationManager] فشل التهيئة:', e);
      throw e;
    }
  }

  // ============================================================
  // 4. تصدير الكائن العام (مع دالة init)
  // ============================================================
  const manager = {
    init,
    fetchUnreadNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    withAuth   // يمكن استخدامها خارجياً
  };

  window.NotificationManager = manager;
  console.log('✅ [NotificationManager] تم التحميل بنجاح');

})();
