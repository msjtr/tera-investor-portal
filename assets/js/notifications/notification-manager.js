/**
 * notification-manager.js
 * مدير الإشعارات المتكامل مع دعم RLS و OneSignal
 * يوفر واجهة init ودوال جلب وتحديث
 * تم التحديث لاستخدام دالة مساعدة للحصول على Supabase client
 * مع تحسين معالجة الأخطاء وتوحيد withAuth مع support-notifications.js
 */

(function() {
  "use strict";

  // ============================================================
  // 0. دالة مساعدة للحصول على Supabase Client
  // ============================================================
  function getSupabaseClient() {
    if (window.teraSupabase) return window.teraSupabase;
    if (window.Support?.getSupabase) return window.Support.getSupabase();
    if (window.waitForSupabase) return window.waitForSupabase();
    if (window.supabase) return window.supabase;
    return null;
  }

  // ============================================================
  // 1. دالة withAuth (لضمان الجلسة قبل أي طلب)
  // ============================================================
  async function withAuth(callback) {
    const sb = getSupabaseClient();
    if (!sb) {
      console.warn('⚠️ [NotificationManager] Supabase client not available');
      return null;
    }

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error || !session) {
        console.log('⏳ [NotificationManager] No active session, skipping request');
        return null;
      }
      console.log('✅ [NotificationManager] Session active for user:', session.user.id);
      return await callback(session);
    } catch (e) {
      console.warn('⚠️ [NotificationManager] withAuth error:', e.message);
      return null;
    }
  }

  // ============================================================
  // 2. الدوال الأساسية (مع تحسينات)
  // ============================================================
  async function fetchUnreadNotifications() {
    return withAuth(async (session) => {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client not available');
      
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('status', 'unread')
        .is('deleted_at', null)   // ✅ إصلاح: استخدام is بدلاً من eq
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      return data;
    });
  }

  async function fetchNotifications(filters = {}, limit = 20) {
    return withAuth(async (session) => {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client not available');
      
      let query = sb
        .from('notifications')
        .select('*')
        .is('deleted_at', null)   // ✅ إصلاح
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
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client not available');
      
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
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client not available');
      
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
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client not available');
      
      const { count, error } = await sb
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false)
        .is('deleted_at', null);   // ✅ إصلاح
      
      if (error) throw error;
      return count;
    });
    return result || 0;
  }

  // ============================================================
  // 3. دالة init المطلوبة من support-notifications.js
  // ============================================================
  async function init(options = {}) {
    console.log('🔔 [NotificationManager] Initializing notification system...');
    try {
      const sb = getSupabaseClient();
      if (!sb) {
        throw new Error('Supabase client not available');
      }

      // التحقق من الجلسة الحالية
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        console.log('✅ [NotificationManager] User logged in:', session.user.id);
      } else {
        console.log('⏳ [NotificationManager] No session, requests will be deferred');
      }

      // إرجاع الكائن manager نفسه للاستخدام
      return window.NotificationManager;
    } catch (e) {
      console.error('❌ [NotificationManager] Init failed:', e);
      throw e;
    }
  }

  // ============================================================
  // 4. تصدير الكائن العام
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
  console.log('✅ [NotificationManager] Loaded successfully');

})();
