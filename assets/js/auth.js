/**
 * auth.js – نظام المصادقة المركزي (v3)
 * يعتمد على supabase-client.js لتوفير Supabase
 * يوفر: login, register, OTP, resetPassword, logout, getSession, getUser, onAuthStateChange
 */
(function() {
    let supabase;

    // انتظار توفر Supabase من supabase-client.js
    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        if (!supabase) {
            console.error('auth.js: Supabase غير متوفر. تأكد من تحميل supabase-client.js أولاً.');
        }
        return supabase;
    }

    // دالة مساعدة للتحقق من قوة كلمة المرور
    function validatePassword(password) {
        if (!password || password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        if (!/[A-Z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف كبير (A-Z)';
        if (!/[a-z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف صغير (a-z)';
        if (!/[0-9]/.test(password)) return 'يجب أن تحتوي كلمة المرور على رقم';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'يجب أن تحتوي كلمة المرور على رمز خاص';
        return null; // صالحة
    }

    // تسجيل الدخول بالبريد وكلمة المرور
    async function login(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    // إرسال رمز تحقق (OTP) لتسجيل الدخول
    async function sendOTP(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithOtp({ email });
        if (error) throw error;
        return data;
    }

    // تأكيد رمز OTP (للاستخدام في verify-otp.js)
    async function verifyOTP(email, token) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.verifyOtp({
            email,
            token,
            type: 'email' // يمكن تغييره حسب الحاجة (sms, signup, etc.)
        });
        if (error) throw error;
        return data;
    }

    // تسجيل حساب جديد
    async function register(email, password, metadata = {}) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
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

    // إرسال رابط استعادة كلمة المرور
    async function resetPassword(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { error } = await sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }

    // تحديث كلمة المرور (بعد استلام رابط الاستعادة)
    async function updatePassword(newPassword) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const passwordError = validatePassword(newPassword);
        if (passwordError) throw new Error(passwordError);

        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }

    // تسجيل الخروج
    async function logout() {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { error } = await sb.auth.signOut();
        if (error) throw error;
    }

    // الحصول على جلسة المستخدم الحالية
    async function getSession() {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data: { session } } = await sb.auth.getSession();
        return session;
    }

    // الحصول على بيانات المستخدم الحالي (مع التحقق من الصلاحية)
    async function getUser() {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data: { user } } = await sb.auth.getUser();
        return user;
    }

    // الاستماع لتغيرات حالة المصادقة (حدث تسجيل دخول/خروج)
    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            if (!sb) return;
            sb.auth.onAuthStateChange((event, session) => {
                callback(event, session);
            });
        });
    }

    // التحقق من وجود جلسة صالحة وتوجيه المستخدم إذا لزم الأمر
    // (تُستخدم من dashboard.js أو صفحات تحتاج حماية)
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        const sb = await getSupabase();
        if (!sb) {
            window.location.replace(redirectUrl);
            return null;
        }
        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) {
                window.location.replace(redirectUrl);
                return null;
            }
            return user;
        } catch (error) {
            window.location.replace(redirectUrl);
            return null;
        }
    }

    // تعريض الدوال العامة
    window.Auth = {
        login,
        sendOTP,
        verifyOTP,
        register,
        resetPassword,
        updatePassword,
        logout,
        getSession,
        getUser,
        onAuthStateChange,
        requireAuth,
        validatePassword
    };

    console.log('auth.js: نظام المصادقة المركزي جاهز');
})();
