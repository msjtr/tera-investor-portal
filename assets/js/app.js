/**
 * ==========================================================================
 * TERA Investor Portal - App Initialization & API Manager (app.js)
 * ==========================================================================
 */

const TeraApp = {
    // 1. إدارة شاشة التحميل العام (Global Loader)
    showLoader: function() {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = '<div class="spinner"></div>';
            
            // تنسيق بسيط للودر عبر JS (يفضل نقله لـ core.css)
            loader.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(255, 255, 255, 0.8); z-index: 99999;
                display: flex; justify-content: center; align-items: center;
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    },

    hideLoader: function() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'none';
    },

    // 2. دالة موحدة للاتصال بالخوادم (API Wrapper)
    apiCall: async function(endpoint, method = 'GET', data = null) {
        this.showLoader();
        
        const token = localStorage.getItem('tera_token');
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: method,
            headers: headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            // TeraCore.config.apiUrl تم تعريفه مسبقاً في core.js
            const response = await fetch(`${TeraCore.config.apiUrl}${endpoint}`, config);
            const result = await response.json();

            if (!response.ok) {
                // معالجة انتهاء الجلسة (401 Unauthorized)
                if (response.status === 401) {
                    TeraAuth.logout(true);
                }
                throw new Error(result.message || 'حدث خطأ غير متوقع');
            }

            return result;
        } catch (error) {
            TeraCore.showAlert(error.message, 'danger');
            throw error;
        } finally {
            this.hideLoader();
        }
    },

    // 3. تهيئة التطبيق عند التحميل
    init: function() {
        console.log("TERA App Initialized.");
        // يمكن هنا استدعاء بيانات المستخدم الأساسية وتحديث الواجهة
    }
};

// تشغيل التهيئة عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    TeraApp.init();
});
