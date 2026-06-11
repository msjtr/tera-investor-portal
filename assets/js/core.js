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

            // مراقبة نشاط المستخدم لإعادة تعيين مؤقت الجلسة
            window.onload = resetTimer;
            document.onmousemove = resetTimer;
            document.onkeydown = resetTimer;
            document.onclick = resetTimer;
            document.onscroll = resetTimer;
        },
        logoutExpired() {
            if (Storage.get('user_token', false)) {
                Storage.remove('user_token');
                alert('انتهت جلسة العمل الحالية لدواعي الأمان. يرجى تسجيل الدخول مجدداً.');
                window.location.href = '/auth/login.html';
            }
        }
    };

    /**
     * محرك طلبات الـ API المشترك (Fetch Wrapper)
     */
    const Api = async function (endpoint, options = {}) {
        const token = Storage.get('user_token', false);
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': 'ar',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const configFetch = {
            method: options.method || 'GET',
            headers: headers,
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            configFetch.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${config.apiBaseUrl}${endpoint}`, configFetch);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'حدث خطأ ما في الخادم.');
            return data;
        } catch (error) {
            console.error('API Error:', error.message);
            throw error;
        }
    };

    // التشغيل التلقائي عند تضمين الملف
    const init = function () {
        console.log('✔ تم تحميل نواة تيرا البرمجية بنجاح.');
        Session.initTimeout();
    };

    // إطلاق التهيئة
    init();

    // تصدير الدوال والموديولات للوصول إليها من الملفات الأخرى
    return {
        config,
        storage: Storage,
        api: Api
    };
})();
