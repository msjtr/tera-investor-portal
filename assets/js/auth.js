/**
 * auth.js – نظام المصادقة المركزي (v5)
 * يدعم تدفق OTP + كلمة مرور دون مسح بيانات مؤقتة
 */
(function() {
    let supabase;

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        if (!supabase) {
            console.error('auth.js: Supabase غير متوفر.');
        }
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

    // تسجيل الدخول بالبريد وكلمة المرور (جلسة كاملة، بدون OTP)
    async function login(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    // إرسال OTP فقط (لا يتحقق من كلمة المرور)
    async function sendOTP(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithOtp({ email });
        if (error) throw error;
        return data;
    }

    // التحقق من OTP
    async function verifyOTP(email, token) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });
        if (error) throw error;
        return data;
    }

    // التدفق الجديد: التحقق من كلمة المرور ثم إرسال OTP
    async function loginWithPasswordAndOTP(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');

        // 1. التحقق من صحة البريد وكلمة المرور
        const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        // 2. إلغاء الجلسة المؤقتة التي أنشأتها signInWithPassword
        await sb.auth.signOut();

        // 3. إرسال رمز OTP
        const { error: otpError } = await sb.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false }
        });
        if (otpError) throw otpError;

        // 4. تخزين البريد للتحقق
        sessionStorage.setItem('otpEmail', email);

        return { success: true };
    }

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

    async function resetPassword(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { error } = await sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }

    async function updatePassword(newPassword) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const passwordError = validatePassword(newPassword);
        if (passwordError) throw new Error(passwordError);
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }

    async function logout() {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        await sb.auth.signOut();
        // تنظيف اختياري (يمكن استدعاء هذه الدالة من الزر)
        localStorage.removeItem('rememberMe');
        sessionStorage.clear();
    }

    async function getSession() {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data: { session } } = await sb.auth.getSession();
        return session;
    }

    async function getUser() {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data: { user } } = await sb.auth.getUser();
        return user;
    }

    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            if (!sb) return;
            sb.auth.onAuthStateChange((event, session) => callback(event, session));
        });
    }

    // التحقق من الجلسة لحماية الصفحات (لا تمسح sessionStorage بالكامل)
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        const sb = await getSupabase();
        if (!sb) {
            window.location.replace(redirectUrl);
            return null;
        }
        try {
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                // جلسة غير صالحة - نسجل الخروج وننظف جزئياً
                await sb.auth.signOut();
                localStorage.removeItem('rememberMe');
                // لا نمسح sessionStorage هنا لنحافظ على otpEmail إن وجد
                window.location.replace(redirectUrl);
                return null;
            }
            return user;
        } catch (e) {
            window.location.replace(redirectUrl);
            return null;
        }
    }

    window.Auth = {
        login,
        sendOTP,
        verifyOTP,
        loginWithPasswordAndOTP,  // الدالة الجديدة الموصى بها
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

    console.log('auth.js v5 جاهز');
})();
