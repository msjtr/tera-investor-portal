/**
 * auth.js – v2 (إدارة المصادقة المركزية)
 * مهام: تسجيل الدخول، التسجيل، استعادة كلمة المرور، تحديث الجلسة
 */
(function() {
    // الاعتماد على supabase-client.js لتوفير Supabase
    let supabase;

    // انتظار Supabase أو استخدام المخزن
    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    // دالة مساعدة للتحقق من قوة كلمة المرور
    function validatePassword(password) {
        const minLength = 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (password.length < minLength) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        if (!hasUpper || !hasLower) return 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة';
        if (!hasNumber) return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
        if (!hasSpecial) return 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل';
        return null;
    }

    // تسجيل الدخول
    async function login(email, password) {
        const sb = await getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    // تسجيل الدخول بواسطة OTP (إرسال رمز)
    async function sendOTP(email) {
        const sb = await getSupabase();
        const { data, error } = await sb.auth.signInWithOtp({ email });
        if (error) throw error;
        return data;
    }

    // تسجيل حساب جديد
    async function register(email, password, metadata = {}) {
        const sb = await getSupabase();
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        if (error) throw error;
        return data;
    }

    // تأكيد البريد الإلكتروني (بعد التسجيل)
    async function confirmEmail(email, token) {
        const sb = await getSupabase();
        const { error } = await sb.auth.verifyOtp({
            email,
            token,
            type: 'signup'
        });
        if (error) throw error;
    }

    // استعادة كلمة المرور (إرسال رابط)
    async function resetPassword(email) {
        const sb = await getSupabase();
        const { error } = await sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }

    // تحديث كلمة المرور بعد استلام رابط الاستعادة
    async function updatePassword(newPassword) {
        const sb = await getSupabase();
        const passwordError = validatePassword(newPassword);
        if (passwordError) throw new Error(passwordError);

        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }

    // تسجيل الخروج (محلياً فقط، لاحظ أن security.js يدير الجلسات)
    async function logout() {
        const sb = await getSupabase();
        const { error } = await sb.auth.signOut();
        if (error) throw error;
    }

    // الحصول على جلسة المستخدم الحالية
    async function getSession() {
        const sb = await getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        return session;
    }

    // الحصول على بيانات المستخدم
    async function getUser() {
        const sb = await getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        return user;
    }

    // الاستماع لتغيرات حالة المصادقة
    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            sb.auth.onAuthStateChange((event, session) => {
                callback(event, session);
            });
        });
    }

    // تعريض الدوال
    window.Auth = {
        login,
        sendOTP,
        register,
        confirmEmail,
        resetPassword,
        updatePassword,
        logout,
        getSession,
        getUser,
        onAuthStateChange,
        validatePassword
    };

    console.log('auth.js: نظام المصادقة جاهز');
})();
