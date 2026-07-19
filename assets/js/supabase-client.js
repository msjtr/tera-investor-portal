/**
 * ==========================================================
 * Tera Investor Portal
 * Supabase Client Initialization (مُحسَّن)
 * المسار: assets/js/supabase-client.js
 * ==========================================================
 * ينشئ عميل Supabase ويخزنه في window.teraSupabase
 * يطلق حدث supabase:ready عند الجاهزية
 * يتضمن waitForSupabase للتوافق
 * ==========================================================
 */

(function () {
    'use strict';

    // منع إنشاء العميل أكثر من مرة
    if (window.teraSupabase) {
        console.log('✅ [supabase-client] العميل موجود مسبقاً.');
        return;
    }

    // إعدادات Supabase
    const SUPABASE_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_QYc4AcGWtJGxalINA_UGZw_fjfVbGqg';

    /**
     * انتظار تحميل مكتبة Supabase من CDN (إن لم تكن محملة بعد)
     * يدعم حالات التحميل المختلفة: window.supabase أو window.supabase.createClient
     */
    function waitForLibrary(timeout = 10000) {
        return new Promise((resolve, reject) => {
            // تحقق فوري
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                return resolve();
            }

            // في بعض الأحيان يتم تحميل supabase كـ window.supabase ولكن لا يزال غير جاهز
            const start = Date.now();
            const timer = setInterval(() => {
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    clearInterval(timer);
                    resolve();
                    return;
                }
                if (Date.now() - start > timeout) {
                    clearInterval(timer);
                    reject(new Error('Supabase JS Library timeout'));
                }
            }, 100);

            // استمع لحدث تحميل المكتبة إذا تم تحميلها عبر script
            document.addEventListener('supabase:loaded', () => {
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    clearInterval(timer);
                    resolve();
                }
            }, { once: true });
        });
    }

    /**
     * إنشاء العميل وتخزينه عالمياً
     */
    async function initSupabase() {
        try {
            await waitForLibrary();

            // التحقق من صحة المفتاح (فحص بسيط)
            if (!SUPABASE_KEY || SUPABASE_KEY.length < 10) {
                throw new Error('مفتاح Supabase غير صحيح');
            }

            // إنشاء العميل مع خيارات محسّنة
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce',
                    storage: window.localStorage,
                    storageKey: 'supabase.auth.token',
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10,
                    },
                },
                db: {
                    schema: 'public',
                },
                global: {
                    headers: {
                        'x-application-name': 'tera-investor-portal',
                    },
                },
            });

            // تخزين العميل عالمياً
            window.teraSupabase = client;
            console.log('✅ [supabase-client] تم إنشاء العميل بنجاح.');

            // التحقق من الجلسة الحالية (اختياري)
            try {
                const { data: { session } } = await client.auth.getSession();
                if (session) {
                    console.log('🔐 [supabase-client] جلسة نشطة للمستخدم:', session.user?.email);
                } else {
                    console.log('ℹ️ [supabase-client] لا توجد جلسة نشطة.');
                }
            } catch (e) {
                // لا نريد أن يتوقف إنشاء العميل بسبب فشل التحقق من الجلسة
                console.warn('⚠️ [supabase-client] فشل التحقق من الجلسة:', e.message);
            }

            // إطلاق حدث الجاهزية لتستخدمه الملفات الأخرى
            document.dispatchEvent(
                new CustomEvent('supabase:ready', { detail: { client } })
            );

        } catch (error) {
            console.error('❌ [supabase-client] فشل إنشاء العميل:', error);
            document.dispatchEvent(
                new CustomEvent('supabase:error', { detail: error })
            );
        }
    }

    // بدء التهيئة فوراً
    initSupabase();

    // ========== دالة انتظار العميل (متوافقة مع جميع الملفات) ==========
    // تُستخدم في الملفات الأخرى للانتظار حتى يصبح العميل جاهزاً
    window.waitForSupabase = function (timeout = 10000) {
        return new Promise((resolve, reject) => {
            // إذا كان العميل موجوداً بالفعل، أعد فوراً
            if (window.teraSupabase) {
                resolve(window.teraSupabase);
                return;
            }

            // تعيين مؤقت للانتهاء
            const timer = setTimeout(() => {
                reject(new Error('Supabase initialization timeout.'));
            }, timeout);

            // الاستماع لحدث الجاهزية
            document.addEventListener(
                'supabase:ready',
                function (event) {
                    clearTimeout(timer);
                    resolve(event.detail.client);
                },
                { once: true }
            );

            // الاستماع لحدث الخطأ
            document.addEventListener(
                'supabase:error',
                function (event) {
                    clearTimeout(timer);
                    reject(event.detail);
                },
                { once: true }
            );

            // في حال كان العميل قد أصبح جاهزاً بين عداد الفحص والحدث (نادر)
            // لكننا نتحقق مرة أخرى بعد وقت قصير
            setTimeout(() => {
                if (window.teraSupabase) {
                    clearTimeout(timer);
                    resolve(window.teraSupabase);
                }
            }, 100);
        });
    };

    // ========== دالة مساعدة للحصول على العميل مباشرة (متزامنة) ==========
    window.getSupabaseClient = function () {
        if (window.teraSupabase) {
            return window.teraSupabase;
        }
        console.warn('⚠️ [supabase-client] العميل غير جاهز بعد، استخدم waitForSupabase بدلاً من ذلك.');
        return null;
    };

    // ========== دالة للتحقق من جاهزية العميل ==========
    window.isSupabaseReady = function () {
        return !!window.teraSupabase;
    };

    // ========== تسجيل إضافي لمساعدات التصحيح ==========
    console.log('ℹ️ [supabase-client] تم تحميل الملف. استخدم waitForSupabase() للحصول على العميل.');
})();
