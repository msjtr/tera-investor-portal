/**
 * auth.js – v6 (مع دوال إجبارية لتتبع الموقع الجغرافي)
 */
(function() {
    let supabase;

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        if (!supabase) console.error('auth.js: Supabase غير متوفر.');
        return supabase;
    }

    function validatePassword(password) {
        if (!password || password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        if (!/[A-Z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف كبير';
        if (!/[a-z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف صغير';
        if (!/[0-9]/.test(password)) return 'يجب أن تحتوي كلمة المرور على رقم';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'يجب أن تحتوي كلمة المرور على رمز خاص';
        return null;
    }

    async function login(email, password) { /* ... كما هو */ }
    async function sendOTP(email) { /* ... */ }
    async function verifyOTP(email, token) { /* ... */ }
    async function loginWithPasswordAndOTP(email, password) { /* ... */ }
    async function register(email, password, metadata = {}) { /* ... */ }
    async function resetPassword(email) { /* ... */ }
    async function updatePassword(newPassword) { /* ... */ }
    async function logout() { /* ... */ }
    async function getSession() { /* ... */ }
    async function getUser() { /* ... */ }
    function onAuthStateChange(callback) { /* ... */ }
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') { /* ... */ }

    // ──────────────────────────────────────
    // دوال الموقع الجغرافي الإجباري
    // ──────────────────────────────────────

    /**
     * طلب إحداثيات GPS من المتصفح (يُظهر نافذة الإذن)
     * @returns {Promise<{latitude: number, longitude: number}>} الإحداثيات أو يرفض
     */
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('متصفحك لا يدعم تحديد الموقع الجغرافي'));
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                }),
                (err) => {
                    if (err.code === err.PERMISSION_DENIED) {
                        reject(new Error('تم رفض إذن الموقع الجغرافي. يجب السماح للتطبيق بتتبع موقعك لأسباب أمنية.'));
                    } else {
                        reject(new Error('تعذر الحصول على الموقع: ' + err.message));
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    /**
     * مراقبة تغيرات إذن الموقع الجغرافي (عندما يغيره المستخدم من إعدادات المتصفح)
     */
    function watchLocationPermission(callback) {
        if (!navigator.permissions || !navigator.permissions.query) return;

        navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
            permissionStatus.onchange = () => {
                callback(permissionStatus.state); // 'granted', 'denied', 'prompt'
            };
        });
    }

    // تعريض الدوال للاستخدام العام
    window.Auth = {
        login, sendOTP, verifyOTP, loginWithPasswordAndOTP,
        register, resetPassword, updatePassword, logout,
        getSession, getUser, onAuthStateChange, requireAuth,
        validatePassword,
        getCurrentPosition,       // دالة الحصول على إحداثيات GPS
        watchLocationPermission   // مراقبة تغيير الإذن
    };

    console.log('auth.js v6 جاهز (مع ميزة الموقع الجغرافي)');
})();
