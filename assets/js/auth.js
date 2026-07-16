/**
 * auth.js – v17 (التحقق من 2FA عبر الجلسة المؤقتة لتجنب انتهاء الجلسة)
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

    // ─── دوال المصادقة الثنائية ──────────────────────────
    const TOTP_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/two-factor';

    async function callTOTPFunction(endpoint, body = {}, session = null) {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase غير متوفر');

        // استخدام الجلسة المُمررة أو الجلب من التخزين
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
                // محاولة تجديد الجلسة إذا لم تكن مؤقتة
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

    async function setupTwoFactor() {
        return await callTOTPFunction('setup');
    }

    async function enableTwoFactor(code) {
        return await callTOTPFunction('enable', { code });
    }

    async function getTwoFactorStatus() {
        return await callTOTPFunction('status');
    }

    async function verifyTwoFactor(code, isBackup = false) {
        return await callTOTPFunction('verify', { code, is_backup: isBackup });
    }

    async function disableTwoFactor(code) {
        return await callTOTPFunction('disable', { code });
    }

    /**
     * التحقق من كلمة المرور والمصادقة الثنائية (تُستخدم في تسجيل الدخول)
     * تحتفظ بالجلسة المؤقتة للتحقق من 2FA
     */
    async function checkPasswordAnd2FA(email, password, totpToken) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');

        // 1. تسجيل الدخول للحصول على جلسة مؤقتة
        const { data, error: signInError } = await sb.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const user = data?.user;
        if (!user) throw new Error('بيانات المستخدم غير متوفرة');

        try {
            // 2. التحقق من حالة 2FA باستخدام الجلسة المؤقتة
            let totpEnabled = false;
            try {
                const status = await callTOTPFunction('status', {}, data.session);
                totpEnabled = status?.two_factor_enabled || false;
            } catch (e) {
                // إذا تعذر التحقق من 2FA، نستمر (قد تكون الخدمة غير متاحة)
                console.warn('تعذر التحقق من 2FA:', e);
            }

            // 3. إذا كانت 2FA مفعلة، يجب تقديم رمز صحيح
            if (totpEnabled) {
                if (!totpToken) {
                    throw new Error('TOTP_REQUIRED');
                }
                await callTOTPFunction('verify', { code: totpToken }, data.session);
            }

            // 4. تخزين اسم المستخدم للاستخدام لاحقًا
            if (user.user_metadata?.full_name) {
                sessionStorage.setItem('otpName', user.user_metadata.full_name);
            } else {
                sessionStorage.setItem('otpName', email.split('@')[0]);
            }

            return { success: true, totpEnabled };
        } finally {
            // 5. إنهاء الجلسة المؤقتة في جميع الأحوال
            await sb.auth.signOut();
        }
    }

    async function loginWithPasswordAndOTP(email, password) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');

        // 1. التحقق من كلمة المرور و 2FA أولاً
        await checkPasswordAnd2FA(email, password);

        // 2. إرسال OTP
        const { error: otpError } = await sb.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false }
        });
        if (otpError) throw otpError;

        // 3. تخزين البريد الإلكتروني
        sessionStorage.setItem('otpEmail', email);

        return { success: true };
    }

    async function register(email, password, metadata = {}) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: metadata } });
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
        if (window.SessionManager) {
            try {
                const info = window.SessionManager.getCurrentSessionInfo();
                if (info?.userId && info?.sessionId) {
                    await window.SessionManager.terminateSession(info.sessionId, info.userId);
                }
            } catch (e) {}
            try { window.SessionManager.stopSessionGuard(); } catch (e) {}
        }

        const sb = await getSupabase();
        if (sb) {
            try { await sb.auth.signOut(); } catch (e) {}
        }

        try { localStorage.removeItem('rememberMe'); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}

        window.location.replace('/auth/auth/login/login.html');
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

    async function isSessionValid() {
        const sb = await getSupabase();
        if (!sb) return false;
        try {
            const { data: { user }, error } = await sb.auth.getUser();
            return !error && !!user;
        } catch (e) { return false; }
    }

    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            if (!sb) return;
            sb.auth.onAuthStateChange((event, session) => callback(event, session));
        });
    }

    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        const sb = await getSupabase();
        if (!sb) {
            window.location.replace(redirectUrl);
            return null;
        }
        try {
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                await logout();
                return null;
            }
            return user;
        } catch (e) {
            await logout();
            return null;
        }
    }

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('متصفحك لا يدعم تحديد الموقع الجغرافي'));
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                err => {
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

    function watchLocationPermission(callback) {
        if (!navigator.permissions?.query) return;
        navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
            permissionStatus.onchange = () => callback(permissionStatus.state);
        });
    }

    window.Auth = {
        login,
        sendOTP,
        verifyOTP,
        loginWithPasswordAndOTP,
        checkPasswordAnd2FA,  // دالة جديدة للتحقق من كلمة المرور و 2FA
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

    console.log('auth.js v17 جاهز');
})();
