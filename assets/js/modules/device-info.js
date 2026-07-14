/**
 * modules/device-info.js – جمع شامل لمعلومات الجهاز والمتصفح
 * يدعم: المحرك، البطارية، الوضع الخفي، ميزات المتصفح، الشبكة، إلخ
 */
(function() {
    'use strict';

    /**
     * الحصول على معلومات شاملة عن الجهاز والمتصفح
     * @returns {Promise<Object>} كائن يحتوي على جميع التفاصيل
     */
    async function getDeviceAndBrowserInfo() {
        const ua = navigator.userAgent;
        const platform = navigator.platform || '';

        // ═══════════════════════════════
        // نظام التشغيل والإصدار
        // ═══════════════════════════════
        let os = 'Unknown', osVersion = '', osArch = '';
        if (/Windows NT 10/.test(ua) || /Windows 11/.test(ua)) {
            os = 'Windows';
            let m = ua.match(/Windows NT (\d+\.\d+)/);
            if (m) {
                const ver = m[1];
                if (ver === '10.0') osVersion = /Windows 11/.test(ua) ? '11' : '10';
                else osVersion = ver;
            }
        } else if (/Windows NT 6.3/.test(ua)) { os = 'Windows'; osVersion = '8.1'; }
        else if (/Windows NT 6.2/.test(ua)) { os = 'Windows'; osVersion = '8'; }
        else if (/Windows NT 6.1/.test(ua)) { os = 'Windows'; osVersion = '7'; }
        else if (/Mac OS X/.test(ua)) {
            os = 'macOS';
            let m = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
            if (m) osVersion = m[1].replace(/_/g, '.');
        } else if (/Android/.test(ua)) {
            os = 'Android';
            let m = ua.match(/Android (\d+\.?\d*(?:\.?\d*)?)/);
            if (m) osVersion = m[1];
        } else if (/iPhone|iPad|iPod/.test(ua)) {
            os = 'iOS';
            let m = ua.match(/OS (\d+[._]\d+(?:[._]\d+)?)/);
            if (m) osVersion = m[1].replace(/_/g, '.');
        } else if (/Linux/.test(ua) && !/Android/.test(ua)) {
            os = 'Linux';
            let m = ua.match(/Linux (\S+)/); // قد يعطي kernel
            if (m) osVersion = m[1];
        } else if (/CrOS/.test(ua)) {
            os = 'Chrome OS';
            let m = ua.match(/CrOS \S+ (\d+\.?\d*)/);
            if (m) osVersion = m[1];
        }

        // محاولة الحصول على بنية المعالج (32/64 بت) – تقريبية
        if (/\b(WOW64|Win64|x64|x86_64|amd64|arm64|aarch64)\b/i.test(ua)) {
            osArch = '64-bit';
        } else if (/\b(i386|i686|x86|Win32)\b/i.test(ua)) {
            osArch = '32-bit';
        }

        // ═══════════════════════════════
        // المتصفح والمحرك
        // ═══════════════════════════════
        let browserName = 'Unknown', browserVersion = '', browserEngine = '', engineVersion = '';
        if (/Edg/i.test(ua)) {
            browserName = 'Edge';
            let m = ua.match(/Edg\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'Blink';
        } else if (/OPR|Opera/i.test(ua)) {
            browserName = 'Opera';
            let m = ua.match(/OPR\/(\d+)/) || ua.match(/Opera\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'Blink';
        } else if (/Chrome/i.test(ua) && /Safari/i.test(ua) && !/Chromium/i.test(ua)) {
            browserName = 'Chrome';
            let m = ua.match(/Chrome\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'Blink';
        } else if (/Chromium/i.test(ua)) {
            browserName = 'Chromium';
            let m = ua.match(/Chromium\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'Blink';
        } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
            browserName = 'Safari';
            let m = ua.match(/Version\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'WebKit';
            let wm = ua.match(/AppleWebKit\/(\d+)/);
            if (wm) engineVersion = wm[1];
        } else if (/Firefox/i.test(ua)) {
            browserName = 'Firefox';
            let m = ua.match(/Firefox\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'Gecko';
            let gm = ua.match(/rv:(\d+)/);
            if (gm) engineVersion = gm[1];
        } else if (/SamsungBrowser/i.test(ua)) {
            browserName = 'Samsung Internet';
            let m = ua.match(/SamsungBrowser\/(\d+)/);
            if (m) browserVersion = m[1];
            browserEngine = 'Blink';
        }

        // إذا لم يُكتشف المحرك بعد
        if (!browserEngine) {
            if (/AppleWebKit/i.test(ua)) browserEngine = 'WebKit';
            else if (/Gecko/i.test(ua)) browserEngine = 'Gecko';
        }

        // ═══════════════════════════════
        // نوع الجهاز
        // ═══════════════════════════════
        let deviceType = 'desktop';
        if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) deviceType = 'mobile';
        else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) deviceType = 'tablet';

        // ═══════════════════════════════
        // الشاشة والدقة
        // ═══════════════════════════════
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const availWidth = window.screen.availWidth;
        const availHeight = window.screen.availHeight;
        const innerW = window.innerWidth;
        const innerH = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        const colorDepth = window.screen.colorDepth || '';
        const orientation = screen.orientation ? screen.orientation.type : '';

        // ═══════════════════════════════
        // اللمس
        // ═══════════════════════════════
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
        const maxTouchPoints = navigator.maxTouchPoints || 0;

        // ═══════════════════════════════
        // اللغة والمنطقة
        // ═══════════════════════════════
        const language = navigator.language || '';
        const languages = navigator.languages ? navigator.languages.join(',') : '';

        // ═══════════════════════════════
        // دعم التخزين
        // ═══════════════════════════════
        const localStorage = testStorage('localStorage');
        const sessionStorage = testStorage('sessionStorage');
        const indexedDB = !!window.indexedDB;

        // ═══════════════════════════════
        // دعم WebGL
        // ═══════════════════════════════
        const webglSupported = (() => {
            try {
                const c = document.createElement('canvas');
                return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
            } catch (e) { return false; }
        })();

        // ═══════════════════════════════
        // ميزات المتصفح
        // ═══════════════════════════════
        const features = {
            webrtc: !!window.RTCPeerConnection,
            service_worker: 'serviceWorker' in navigator,
            web_socket: 'WebSocket' in window,
            web_assembly: typeof WebAssembly === 'object',
            web_worker: 'Worker' in window,
            shared_worker: 'SharedWorker' in window,
            speech_recognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
            speech_synthesis: 'speechSynthesis' in window,
            notification: 'Notification' in window,
            geolocation: 'geolocation' in navigator,
            bluetooth: 'bluetooth' in navigator,
            usb: 'usb' in navigator,
            clipboard: 'clipboard' in navigator,
            credentials: 'credentials' in navigator,
            payment_request: 'PaymentRequest' in window,
            webgl: webglSupported,
            webgl2: (() => {
                try {
                    return !!document.createElement('canvas').getContext('webgl2');
                } catch (e) { return false; }
            })(),
            webauthn: 'PublicKeyCredential' in window,
            webxr: 'xr' in navigator,
            webgpu: 'gpu' in navigator,
        };

        // ═══════════════════════════════
        // البطارية (إن كانت API متاحة)
        // ═══════════════════════════════
        let battery = null;
        if ('getBattery' in navigator) {
            try {
                const b = await navigator.getBattery();
                battery = {
                    charging: b.charging,
                    level: b.level !== undefined ? Math.round(b.level * 100) + '%' : null,
                    charging_time: b.chargingTime === Infinity ? 'لا نهائي' : b.chargingTime,
                    discharging_time: b.dischargingTime === Infinity ? 'لا نهائي' : b.dischargingTime
                };
            } catch (e) {
                // لا تتوفر معلومات البطارية
            }
        }

        // ═══════════════════════════════
        // الشبكة والاتصال
        // ═══════════════════════════════
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const networkInfo = {
            online: navigator.onLine,
            type: connection?.effectiveType || null,
            downlink: connection?.downlink || null,
            rtt: connection?.rtt || null,
            save_data: connection?.saveData || false,
            cellular_type: connection?.type || null // قد يعطي 'cellular', 'wifi', 'ethernet'...
        };

        // ═══════════════════════════════
        // ذاكرة الجهاز والمعالج
        // ═══════════════════════════════
        const hardwareConcurrency = navigator.hardwareConcurrency || 0;
        const deviceMemory = navigator.deviceMemory || 0; // بالغيغابايت

        // ═══════════════════════════════
        // كشف الوضع الخفي (Incognito) – تقديري
        // ═══════════════════════════════
        const isIncognito = await detectIncognito();

        // ═══════════════════════════════
        // بصمة محسّنة (تجمع عدة عوامل)
        // ═══════════════════════════════
        const fingerprint = await generateFingerprint(ua);

        // ═══════════════════════════════
        // المنطقة الزمنية
        // ═══════════════════════════════
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const timezoneOffset = new Date().getTimezoneOffset(); // بالدقائق

        // ═══════════════════════════════
        // جافا سكريبت مفعل؟ (بديهي لكن للتأكيد)
        // ═══════════════════════════════
        const jsEnabled = true; // بما أن الكود يعمل، فجافا سكريبت مفعّلة

        // ═══════════════════════════════
        // خاصية PDF و Flash (قديمة)
        // ═══════════════════════════════
        const plugins = Array.from(navigator.plugins || []).map(p => p.name).join(';');
        const mimeTypes = Array.from(navigator.mimeTypes || []).map(m => m.type).join(';');

        // ═══════════════════════════════
        // تجميع كل شيء
        // ═══════════════════════════════
        return {
            // أساسيات الجهاز
            device_type: deviceType,
            operating_system: os,
            os_version: osVersion,
            os_architecture: osArch,
            platform: platform,

            // المتصفح
            browser_name: browserName,
            browser_version: browserVersion,
            browser_engine: browserEngine,
            engine_version: engineVersion,
            user_agent: ua,

            // الشاشة
            screen_resolution: `${screenWidth}x${screenHeight}`,
            available_screen: `${availWidth}x${availHeight}`,
            inner_resolution: `${innerW}x${innerH}`,
            pixel_ratio: pixelRatio,
            color_depth: colorDepth,
            orientation: orientation,

            // اللمس
            touch_supported: hasTouch,
            max_touch_points: maxTouchPoints,

            // اللغة
            language: language,
            languages: languages,

            // الوقت
            timezone: timezone,
            timezone_offset: timezoneOffset,

            // دعم التخزين
            cookies_enabled: navigator.cookieEnabled,
            local_storage: localStorage,
            session_storage: sessionStorage,
            indexed_db: indexedDB,

            // المعالج والذاكرة
            cpu_cores: hardwareConcurrency,
            device_memory: deviceMemory ? deviceMemory + ' GB' : '',

            // الشبكة
            network_online: networkInfo.online,
            network_type: networkInfo.type || networkInfo.cellular_type,
            network_downlink: networkInfo.downlink,
            network_rtt: networkInfo.rtt,
            network_save_data: networkInfo.save_data,

            // البطارية
            battery: battery,

            // ميزات المتصفح
            browser_features: features,

            // الوضع الخفي
            incognito_likely: isIncognito,

            // بصمة
            fingerprint: fingerprint,

            // إضافات
            js_enabled: jsEnabled,
            plugins: plugins,
            mime_types: mimeTypes,
        };
    }

    // ─────────────────────────────────
    // دوال مساعدة داخلية
    // ─────────────────────────────────

    /** اختبار وجود نوع تخزين معين */
    function testStorage(type) {
        try {
            const storage = window[type];
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return false;
        }
    }

    /** تقدير ما إذا كان المتصفح في وضع التصفح المتخفي */
    async function detectIncognito() {
        // استخدام واجهة FileSystem (إن وجدت) لاكتشاف الوضع الخاص
        if (window.FileSystem && window.FileSystem.request) {
            return false; // غير دقيق لكن معظم المتصفحات الخاصة لا تدعمها
        }
        // فحص quota للتخزين
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const { quota, usage } = await navigator.storage.estimate();
                // في الوضع الخاص عادة تكون الحصة أقل بكثير
                if (quota < 120000000 && usage === 0) return true;
            } catch (e) {}
        }
        // فحص indexedDB (في بعض الأوضاع الخاصة لا يتوفر)
        try {
            const db = window.indexedDB.open('test');
            db.onsuccess = () => db.result.close();
            db.onerror = () => { return true; }; // قد يكون مؤشراً
        } catch (e) {
            return true; // فشل فتح قاعدة البيانات
        }
        return false; // افتراضي
    }

    /** توليد بصمة تجمع بين عدة عناصر */
    async function generateFingerprint(ua) {
        const components = [
            ua,
            navigator.language,
            navigator.platform,
            window.screen.width,
            window.screen.height,
            window.screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || '',
            navigator.deviceMemory || '',
        ];
        // محاولة استخدام Canvas بصمة
        let canvasFp = '';
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px "Arial"';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('DeviceInfo', 2, 15);
            canvasFp = canvas.toDataURL();
        } catch (e) {}

        // WebGL بصمة
        let webglFp = '';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    webglFp = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                }
            }
        } catch (e) {}

        const raw = components.join('###') + canvasFp + webglFp;
        // تجزئة بسيطة (Hash)
        return await simpleHash(raw);
    }

    async function simpleHash(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 32); // أول 32 حرف
    }

    // ═══════════════════════════════
    // واجهة عامة
    // ═══════════════════════════════
    window.DeviceInfo = {
        getDeviceAndBrowserInfo
    };
})();
