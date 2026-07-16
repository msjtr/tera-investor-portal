/**
 * auth.js – v18 (دعم تسجيل الدخول بكلمة المرور + TOTP + فحص مخاطر)
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

    // ─── دوال المصادقة الأساسية ──────────────────────────
    async function login(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function sendOTP(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithOtp({ email });
        if (error) throw error;
        return data;
    }

    async function verifyOTP(email, token) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        return data;
    }

    // ─── المصادقة الثنائية ──────────────────────────────
    const TOTP_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/two-factor';

    async function callTOTPFunction(endpoint, body = {}, session = null) {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase غير متوفر');

        let currentSession = session;
        if (!currentSession) {
            const { data } = await sb.auth.getSession();
            currentSession = data.session;
        }

        if (!currentSession) {
            throw new Error('NO_SESSION');
        }

        try {
            const res = await fetch(`${TOTP_FUNCTION_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession.access_token}`
                },
                body: JSON.stringify(body)
            });

            if (res.status === 401 && !session) {
                const { data: { session: newSession }, error: refreshError } = await sb.auth.refreshSession();
                if (!refreshError && newSession) {
                    return await callTOTPFunction(endpoint, body, newSession);
                }
                throw new Error('SESSION_EXPIRED');
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'فشل الطلب');
            }

            return res.json();
        } catch (e) {
            if (e.message === 'NO_SESSION' || e.message === 'SESSION_EXPIRED') throw e;
            if (e.message.includes('Failed to fetch')) {
                throw new Error('تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.');
            }
            throw e;
        }
    }

    async function setupTwoFactor() { return await callTOTPFunction('setup'); }
    async function enableTwoFactor(code) { return await callTOTPFunction('enable', { code }); }
    async function getTwoFactorStatus() { return await callTOTPFunction('status'); }
    async function verifyTwoFactor(code, isBackup = false) { return await callTOTPFunction('verify', { code, is_backup: isBackup }); }
    async function disableTwoFactor(code) { return await callTOTPFunction('disable', { code }); }

    // ─── فحص المخاطر ─────────────────────────────────────
    async function checkRisk(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase غير متوفر');

        // 1. تسجيل الدخول المؤقت
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const user = data?.user;
        if (!user) throw new Error('بيانات المستخدم غير متوفرة');

        try {
            // 2. فحص المخاطر (IP، جهاز جديد...)
            let requiresTOTP = false;
            try {
                const riskData = await callTOTPFunction('check-risk', { ip: 'unknown' }, data.session);
                requiresTOTP = riskData?.requires_totp || false;
            } catch (e) {
                // إذا تعذر الفحص، نتعامل معه كأنه لا توجد مخاطر
                console.warn('تعذر فحص المخاطر:', e);
            }

            // 3. إذا تطلب TOTP، نطلب الرمز
            if (requiresTOTP) {
                throw new Error('TOTP_REQUIRED');
            }

            // 4. نجاح بدون TOTP
            if (user.user_metadata?.full_name) {
                sessionStorage.setItem('otpName', user.user_metadata.full_name);
            } else {
                sessionStorage.setItem('otpName', email.split('@')[0]);
            }
            return { success: true, requiresTOTP: false };
        } finally {
            await sb.auth.signOut();
        }
    }

    // ─── تسجيل الدخول بكلمة المرور (مع فحص المخاطر) ─────
    let loginAttempts = 0;
    const MAX_ATTEMPTS = 5;

    async function loginWithPassword(email, password, totpToken = null) {
        if (loginAttempts >= MAX_ATTEMPTS) {
            throw new Error('تم تجاوز عدد المحاولات المسموح بها. يرجى استخدام المصادقة الثنائية.');
        }

        try {
            const result = await checkRisk(email, password);
            // إذا تطلب TOTP
            if (result.requiresTOTP) {
                if (!totpToken) {
                    throw new Error('TOTP_REQUIRED');
                }
                // إعادة المحاولة مع TOTP (سننفذ التحقق في Edge Function)
                // لكن للتبسيط، نستخدم نفس منطق checkPasswordAnd2FA
                await checkPasswordAnd2FA(email, password, totpToken);
            }
            // إعادة تعيين العداد عند النجاح
            loginAttempts = 0;
            return result;
        } catch (e) {
            if (e.message === 'TOTP_REQUIRED') throw e;
            loginAttempts++;
            if (loginAttempts >= MAX_ATTEMPTS) {
                throw new Error('تم تجاوز عدد المحاولات. يرجى استخدام المصادقة الثنائية.');
            }
            throw e;
        }
    }

    // ─── تسجيل الدخول بالمصادقة الثنائية فقط ─────────────
    async function loginWithTOTP(email, token) {
        // سنستخدم Edge Function جديدة 'verify-totp-login' التي ستتحقق وتُنشئ جلسة
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase غير متوفر');

        // 1. الحصول على user_id من email
        const { data: userData, error: userError } = await sb.auth.admin?.listUsers();
        let userId = null;
        if (userData?.users) {
            const found = userData.users.find(u => u.email === email);
            userId = found?.id;
        }
        if (!userId) throw new Error('المستخدم غير موجود');

        // 2. استدعاء Edge Function للتحقق من TOTP وإنشاء جلسة
        const res = await fetch(`${TOTP_FUNCTION_URL}/verify-totp-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'فشل التحقق');
        }
        const { session } = await res.json();
        if (!session) throw new Error('فشل إنشاء الجلسة');

        // 3. تعيين الجلسة في Supabase (تخزينها)
        await sb.auth.setSession(session);
        return { success: true };
    }

    // ─── تسجيل الدخول بكلمة المرور + OTP (الطريقة الحالية) ──
    async function loginWithPasswordAndOTP(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');

        // 1. التحقق من كلمة المرور و 2FA
        await checkPasswordAnd2FA(email, password);

        // 2. إرسال OTP
        const { error: otpError } = await sb.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false }
        });
        if (otpError) throw otpError;

        sessionStorage.setItem('otpEmail', email);
        return { success: true };
    }

    async function checkPasswordAnd2FA(email, password, totpToken) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');

        const { data, error: signInError } = await sb.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const user = data?.user;
        if (!user) throw new Error('بيانات المستخدم غير متوفرة');

        try {
            let totpEnabled = false;
            try {
                const status = await callTOTPFunction('status', {}, data.session);
                totpEnabled = status?.two_factor_enabled || false;
            } catch (e) {
                console.warn('تعذر التحقق من 2FA:', e);
            }

            if (totpEnabled) {
                if (!totpToken) {
                    throw new Error('TOTP_REQUIRED');
                }
                await callTOTPFunction('verify', { code: totpToken }, data.session);
            }

            if (user.user_metadata?.full_name) {
                sessionStorage.setItem('otpName', user.user_metadata.full_name);
            } else {
                sessionStorage.setItem('otpName', email.split('@')[0]);
            }

            return { success: true, totpEnabled };
        } finally {
            await sb.auth.signOut();
        }
    }

    // ─── الدوال الأساسية الأخرى ─────────────────────────
    async function register(email, password, metadata = {}) { /* ... كما هي */ }
    async function resetPassword(email) { /* ... */ }
    async function updatePassword(newPassword) { /* ... */ }
    async function logout() { /* ... */ }
    async function getSession() { /* ... */ }
    async function getUser() { /* ... */ }
    async function isSessionValid() { /* ... */ }
    function onAuthStateChange(callback) { /* ... */ }
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') { /* ... */ }
    function getCurrentPosition() { /* ... */ }
    function watchLocationPermission(callback) { /* ... */ }

    // ─── تعريض الدوال ──────────────────────────────────
    window.Auth = {
        login,
        sendOTP,
        verifyOTP,
        loginWithPasswordAndOTP,
        loginWithPassword,     // 🆕
        loginWithTOTP,         // 🆕
        checkRisk,             // 🆕
        checkPasswordAnd2FA,
        register,
        resetPassword,
        updatePassword,
        logout,
        getSession,
        getUser,
        isSessionValid,
        onAuthStateChange,
        requireAuth,
        validatePassword,
        getCurrentPosition,
        watchLocationPermission,
        setupTwoFactor,
        enableTwoFactor,
        getTwoFactorStatus,
        verifyTwoFactor,
        disableTwoFactor
    };

    console.log('auth.js v18 (2FA Smart) جاهز');
})();
