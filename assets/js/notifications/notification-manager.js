/**
 * notification-manager.js
 * مدير الإشعارات المتكامل مع دعم RLS و OneSignal
 * يوفر واجهة init ودوال جلب وتحديث وإضافة
 * تم إضافة: addNotification, updateNotification, clear
 * تم تحسين الجلب مع إعادة المحاولة وتحديث الواجهة تلقائياً
 */

(function() {
  "use strict";

  // ─── المتغيرات الداخلية ───
  let listeners = {};
  let _initialized = false;

  // ─── دالة مساعدة للحصول على Supabase Client ───
  function getSupabaseClient() {
    if (window.teraSupabase) return window.teraSupabase;
    if (window.Support?.getSupabase) return window.Support.getSupabase();
    if (window.waitForSupabase) return window.waitForSupabase();
    if (window.supabase) return window.supabase;
    return null;
  }

  // ─── دالة withAuth (لضمان الجلسة قبل أي طلب) ───
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

  // ─── دوال جلب البيانات مع إعادة المحاولة ───
  async function fetchNotificationsWithRetry(filters = {}, limit = 50, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 [NotificationManager] Fetch attempt ${attempt}/${maxRetries}`);
        
        const data = await withAuth(async (session) => {
          const sb = getSupabaseClient();
          if (!sb) throw new Error('Supabase client not available');
          
          let query = sb
            .from('notifications')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(limit);
            
          if (filters.type) query = query.eq('type', filters.type);
          if (filters.category) query = query.eq('category', filters.category);
          if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
          
          const { data, error } = await query;
          if (error) throw error;
          return data;
        });
        
        if (data && data.length > 0) {
          console.log(`✅ [NotificationManager] Fetched ${data.length} notifications on attempt ${attempt}`);
          return data;
        }
        
        if (attempt < maxRetries) {
          console.log(`⏳ [NotificationManager] No data yet, retrying in 500ms... (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        lastError = e;
        console.warn(`⚠️ [NotificationManager] Attempt ${attempt} failed:`, e.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    console.warn('⚠️ [NotificationManager] All fetch attempts failed or returned empty');
    return [];
  }

  // ─── دوال جلب البيانات العامة ───
  async function fetchUnreadNotifications() {
    return withAuth(async (session) => {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase client not available');
      
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('status', 'unread')
        .is('deleted_at', null)
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
        .is('deleted_at', null)
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

  // ─── دوال التحديث ───
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
      
      // تحديث الكاش والواجهة محلياً
      const cache = window.NotificationCache;
      if (cache && typeof cache.update === 'function') {
        cache.update(notificationId, { is_read: true, read_at: new Date().toISOString() });
      }
      refreshUI();
      
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
      
      // تحديث الكاش والواجهة محلياً
      const cache = window.NotificationCache;
      if (cache && typeof cache.markAllAsRead === 'function') {
        cache.markAllAsRead();
      }
      refreshUI();
      
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
        .is('deleted_at', null);
      
      if (error) throw error;
      return count;
    });
    return result || 0;
  }

  // ─── دوال إدارة الإشعارات المحلية ───
  
  function addNotification(notification) {
    if (!notification || !notification.id) {
      console.warn('⚠️ [NotificationManager] Invalid notification:', notification);
      return;
    }

    console.log('📨 [NotificationManager] Adding notification:', notification.id);

    const cache = window.NotificationCache;
    if (cache && typeof cache.add === 'function') {
      cache.add(notification);
    } else if (cache && typeof cache.init === 'function') {
      const existing = cache.getAll ? cache.getAll() : [];
      existing.push(notification);
      cache.init(existing);
    }

    refreshUI();
    _emit('notification:added', notification);
  }

  function updateNotification(id, updates) {
    if (!id || !updates) {
      console.warn('⚠️ [NotificationManager] Invalid update params');
      return;
    }

    console.log('🔄 [NotificationManager] Updating notification:', id);

    const cache = window.NotificationCache;
    if (cache && typeof cache.update === 'function') {
      cache.update(id, updates);
    }

    refreshUI();
    _emit('notification:updated', { id, updates });
  }

  function clear() {
    console.log('🧹 [NotificationManager] Clearing all notifications');
    
    const cache = window.NotificationCache;
    if (cache && typeof cache.clear === 'function') {
      cache.clear();
    } else if (cache && typeof cache.init === 'function') {
      cache.init([]);
    }

    refreshUI();
    _emit('notifications:cleared');
  }

  // ─── دالة مساعدة لتحديث الواجهة ───
  function refreshUI() {
    if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
      window.NotificationUI.refresh();
    } else {
      // احتياطي: محاولة تحديث الإحصائيات فقط
      const cache = window.NotificationCache;
      if (cache && typeof cache.getStats === 'function' && window.NotificationUI && typeof window.NotificationUI.updateStats === 'function') {
        window.NotificationUI.updateStats(cache.getStats());
      }
    }
  }

  // ─── نظام المستمعين ───
  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function _emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.warn('⚠️ [NotificationManager] Listener error:', e);
      }
    });
  }

  // ─── دالة init (مع تحميل البيانات الأولية) ───
  async function init(options = {}) {
    console.log('🔔 [NotificationManager] Initializing notification system...');
    try {
      const sb = getSupabaseClient();
      if (!sb) {
        throw new Error('Supabase client not available');
      }

      // التحقق من الجلسة
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        console.log('✅ [NotificationManager] User logged in:', session.user.id);
        
        // جلب الإشعارات مع إعادة المحاولة
        const data = await fetchNotificationsWithRetry({}, 50, 3);
        if (data && data.length > 0) {
          // تهيئة الكاش
          const cache = window.NotificationCache;
          if (cache && typeof cache.init === 'function') {
            cache.init(data);
          }
          // إضافة كل إشعار إلى المدير (لتحديث الواجهة)
          data.forEach(n => addNotification(n));
          console.log(`✅ [NotificationManager] Loaded ${data.length} notifications`);
        } else {
          console.log('ℹ️ [NotificationManager] No notifications found');
        }
      } else {
        console.log('⏳ [NotificationManager] No session, notifications will be loaded after login');
      }

      _initialized = true;
      return window.NotificationManager;
    } catch (e) {
      console.error('❌ [NotificationManager] Init failed:', e);
      throw e;
    }
  }

  // ─── تصدير الكائن العام ───
  const manager = {
    init,
    fetchUnreadNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    withAuth,
    addNotification,
    updateNotification,
    clear,
    on,
    off,
    refreshUI, // للاستخدام الخارجي
    // تصدير دالة الجلب مع إعادة المحاولة للاستخدام المباشر
    fetchNotificationsWithRetry
  };

  window.NotificationManager = manager;
  console.log('✅ [NotificationManager] Loaded successfully (with enhanced fetch and retry)');
})();
