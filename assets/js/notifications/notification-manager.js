/**
 * notification-manager.js
 * مدير الإشعارات – جلب وعرض وتحديث الإشعارات مع دعم RLS
 * يستخدم withAuth للتحقق من الجلسة قبل أي طلب
 * 
 * المتغيرات المعتمدة:
 * - window.teraSupabase : عميل Supabase (مفترض وجوده)
 * - window.OneSignalManager : (اختياري) للاستفادة من دوال withAuth
 */

(function() {
  "use strict";

  // ============================================================
  // 1. دالة withAuth (نسخة مستقلة في هذا الملف)
  //    يمكنك أيضاً استيرادها من OneSignalManager إذا كان موجوداً
  // ============================================================
  async function withAuth(callback) {
    const sb = window.teraSupabase || window.supabase;
    if (!sb) {
      console.warn('⚠️ [notifications] Supabase غير متاح');
      return null;
    }

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error || !session) {
        console.log('⏳ [notifications] المستخدم غير مسجل، سيتم تخطي الطلب');
        return null;
      }
      return await callback(session);
    } catch (e) {
      console.warn('⚠️ [notifications] خطأ في التحقق من الجلسة:', e);
      return null;
    }
  }

  // ============================================================
  // 2. دوال جلب الإشعارات (معدلة)
  // ============================================================

  /**
   * جلب آخر 50 إشعار للمستخدم الحالي (غير مقروءة)
   * @returns {Promise<Array|null>}
   */
  async function fetchUnreadNotifications() {
    return withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        // ❌ لا ترسل user_id هنا، RLS ستقوم بتصفيتها تلقائياً
        .eq('status', 'unread')
        .eq('deleted_at', null)      // استثناء المحذوف منطقياً
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    });
  }

  /**
   * جلب جميع الإشعارات (مع دعم التصفية حسب النوع)
   * @param {Object} filters - مثلاً { type: 'system', category: 'alert' }
   * @param {number} limit - عدد النتائج
   * @returns {Promise<Array|null>}
   */
  async function fetchNotifications(filters = {}, limit = 20) {
    return withAuth(async (session) => {
      const sb = window.teraSupabase || window.supabase;
      let query = sb
        .from('notifications')
        .select('*')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      // تطبيق الفلاتر (مع تجاهل user_id)
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
      // يمكن إضافة المزيد حسب الحاجة

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  /**
   * تحديث حالة الإشعار (تحديد كمقروء)
   * @param {string} notificationId
   * @returns {Promise<boolean>}
   */
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
        .eq('user_id', session.user.id); // تأكد من أنها تخص المستخدم

      if (error) throw error;
      return true;
    });
  }

  /**
   * تحديد جميع الإشعارات كمقروءة
   * @returns {Promise<boolean>}
   */
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

  /**
   * الحصول على عدد الإشعارات غير المقروءة (لشارة العد)
   * @returns {Promise<number>}
   */
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
  // 3. تصدير الدوال إلى النطاق العام (اختياري)
  // ============================================================

  window.NotificationManager = {
    fetchUnreadNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    withAuth   // يمكن استخدامها من الخارج
  };

  console.log('✅ [notification-manager] تم تحميل مدير الإشعارات بنجاح');

})();
