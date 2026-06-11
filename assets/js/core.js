/**
 * ==========================================================================
 * TERA INVESTOR PORTAL - CORE ENGINE (core.js)
 * ==========================================================================
 * يمثل هذا الملف النواة البرمجية المشتركة لكافة صفحات بوابة مستثمري تيرا.
 */

const TeraCore = (function () {
    'use strict';

    // الإعدادات الافتراضية للنظام
    const config = {
        apiBaseUrl: 'https://api.tera-invest.com/v1',
        sessionTimeout: 15 * 60 * 1000, // 15 دقيقة تنتهي بعدها الجلسة تلقائياً
        storagePrefix: 'tera_'
    };

    /**
     * إدارة التخزين المحلي الآمن (Session & Local Storage)
     */
    const Storage = {
        set(key, value, persistent = true) {
            const storage = persistent ? localStorage : sessionStorage;
            storage.setItem(config.storagePrefix + key, JSON.stringify(value));
        },
        get(key, persistent = true) {
            const storage = persistent ? localStorage : sessionStorage;
            const data = storage.getItem(config.storagePrefix + key);
            try {
                return data ? JSON.parse(data) : null;
            } catch (e) {
                return data;
            }
        },
        remove(key) {
            localStorage.removeItem(config.storagePrefix + key);
            sessionStorage.removeItem(config.storagePrefix + key);
        }
    };

    /**
     * إدارة جلسة عمل المستثمر والتأمين الأولي
     */
    const Session = {
        initTimeout() {
            let timeout;
            const resetTimer = () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.logoutExpired();
                }, config.sessionTimeout);
            };

            // تم الإصلاح: استخدام addEventListener بدلاً من تصفير الخصائص المباشرة لضمان عدم تعارض السكربتات
            const activityEvents = ['load', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            activityEvents.forEach(event => {
                window.addEventListener(event, resetTimer, { passive: true });
            });
            
            // تشغيل أولي للمؤقت
            resetTimer();
        },
        logoutExpired() {
            // فحص وجود التوكن في الـ Local أو الـ Session لمنع التكرار
            if (Storage.get('user_token', false) || Storage.get('user_token', true)) {
                Storage.remove('user_token');
                
                // تم الإصلاح: استدعاء التنبيه الراقي المعتمد بملف الواجهات بدلاً من الـ alert التقليدية المزعجة
                if (typeof TeraUI !== 'undefined' && TeraUI.showAlert) {
                    TeraUI.showAlert('انتهت جلسة العمل الحالية لدواعي الأمان. يرجى تسجيل الدخول مجدداً.', 'warning');
                }
                
                setTimeout(() => {
                    window.location.href = '/auth/login.html';
                }, 2000); // تأخير بسيط ليتمكن المستثمر من قراءة رسالة التنبيه المريحة
            }
        }
    };

    /**
     * محرك طلبات الـ API المشترك (Fetch Wrapper)
     */
    const Api = async function (endpoint, options = {}) {
        // فحص التوكن من كلا المخزنين لضمان التحقق الآمن
        const token = Storage.get('user_token', false) || Storage.get('user_token', true);
        
        const headers = {
            'Accept': 'application/json',
            'Accept-Language': 'ar',
            ...options.headers
        };

        // تم الإصلاح: عدم فرض Content-Type إذا كان الـ body عبارة عن FormData (مثل رفع مستندات المستثمر)
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const configFetch = {
            method: options.method || 'GET',
            headers: headers,
            ...options
        };

        // تحويل البيانات المرسلة إلى JSON فقط إذا لم تكن FormData أو نصوصاً جاهزة
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            configFetch.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${config.apiBaseUrl}${endpoint}`, configFetch);
            
            // التعامل الذكي مع الردود الفارغة (مثل 204 No Content)
            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await response.json() : null;

            // إذا انتهت صلاحية التوكن من جهة السيرفر (401 Unauthorized) يتم إنهاء الجلسة فوراً
            if (response.status === 401) {
                Session.logoutExpired();
                throw new Error('جلسة العمل غير مصرح بها أو منتهية.');
            }

            if (!response.ok) {
                throw new Error(data?.message || `خطأ في النظام: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Engine Error:', error.message);
            throw error;
        }
    };

    // التشغيل التلقائي عند تضمين الملف
    const init = function () {
        console.log('✔ تم تحميل نواة تيرا البرمجية بنجاح.');
        // تشغيل مراقبة الجلسة فقط إذا كان المستثمر مسجلاً لدخوله بالفعل
        if (Storage.get('user_token', false) || Storage.get('user_token', true)) {
            Session.initTimeout();
        }
    };

    // حماية تنفيذ التهيأة للتأكد من جاهزية مستندات الـ DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // تصدير الدوال والموديولات للوصول إليها من الملفات الأخرى
    return {
        config,
        storage: Storage,
        api: Api,
        logout: Session.logoutExpired.bind(Session)
    };
})();
