/**
 * modules/device-info.js - جمع معلومات الجهاز والمتصفح
 */
(function() {
    function getDeviceAndBrowserInfo() {
        const ua = navigator.userAgent;
        let os = 'Unknown', osVersion = '';
        if (/Windows NT 10/.test(ua)) { os = 'Windows'; osVersion = '10'; }
        else if (/Windows NT 6.3/.test(ua)) { os = 'Windows'; osVersion = '8.1'; }
        else if (/Mac OS X/.test(ua)) { os = 'macOS'; let m = ua.match(/Mac OS X (\d+[._]\d+)/); if(m) osVersion = m[1].replace('_', '.'); }
        else if (/Android/.test(ua)) { os = 'Android'; let m = ua.match(/Android (\d+\.?\d*)/); if(m) osVersion = m[1]; }
        else if (/iPhone|iPad/.test(ua)) { os = 'iOS'; let m = ua.match(/OS (\d+[._]\d+)/); if(m) osVersion = m[1].replace('_', '.'); }
        else if (/Linux/.test(ua)) os = 'Linux';

        let browserName = 'Unknown', browserVersion = '';
        if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) { browserName = 'Chrome'; let m = ua.match(/Chrome\/(\d+)/); if(m) browserVersion = m[1]; }
        else if (/Firefox/i.test(ua)) { browserName = 'Firefox'; let m = ua.match(/Firefox\/(\d+)/); if(m) browserVersion = m[1]; }
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) { browserName = 'Safari'; let m = ua.match(/Version\/(\d+)/); if(m) browserVersion = m[1]; }
        else if (/Edg/i.test(ua)) { browserName = 'Edge'; let m = ua.match(/Edg\/(\d+)/); if(m) browserVersion = m[1]; }

        let deviceType = 'computer';
        if (/Mobi|Android|iPhone/i.test(ua)) deviceType = 'mobile';
        else if (/iPad|Tablet/i.test(ua)) deviceType = 'tablet';

        const fingerprint = btoa(ua + window.screen.width + window.screen.height + navigator.language + navigator.platform).substring(0, 32);

        return {
            device_type: deviceType,
            browser_name: browserName,
            browser_version: browserVersion,
            browser_engine: '',
            user_agent: ua,
            operating_system: os,
            os_version: osVersion,
            platform: navigator.platform || '',
            language: navigator.language || '',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            color_depth: window.screen.colorDepth || '',
            pixel_ratio: window.devicePixelRatio || 1,
            cpu_cores: navigator.hardwareConcurrency || '',
            device_memory: navigator.deviceMemory || '',
            touch_supported: !!('ontouchstart' in window || navigator.maxTouchPoints > 0),
            cookies_enabled: navigator.cookieEnabled,
            local_storage: typeof Storage !== 'undefined' && !!window.localStorage,
            session_storage: typeof Storage !== 'undefined' && !!window.sessionStorage,
            indexed_db: !!window.indexedDB,
            webgl_supported: (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch(e){ return false; } })(),
            fingerprint: fingerprint,
            network_type: navigator.connection?.effectiveType || ''
        };
    }

    window.DeviceInfo = { getDeviceAndBrowserInfo };
})();
