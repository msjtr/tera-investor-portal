/**
 * auth.js – v14 (دعم المصادقة الثنائية TOTP + تسجيل خروج آمن)
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

    /**
     * التحقق مما إذا كانت المصادقة الثنائية مفعلة للمستخدم
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    async function isTOTPEnabled(userId) {
        const sb = await getSupabase();
        if (!sb) return false;
        const { data, error } = await sb.from('user_totp')
            .select('totp_enabled')
            .eq('user_id', userId)
            .maybeSingle();
        if (error) return false;
        return data?.totp_enabled === true;
    }

    /**
     * التحقق من رمز TOTP المدخل
     * @param {string} userId
     * @param {string} token
     * @returns {Promise<boolean>}
     */
    async function verifyTOTPCode(userId, token) {
        const sb = await getSupabase();
        if (!sb) return false;
        const { data, error } = await sb.from('user_totp')
            .select('totp_secret')
            .eq('user_id', userId)
            .eq('totp_enabled', true)
            .maybeSingle();
        if (error || !data?.totp_secret) return false;

        // استخدام وحدة TwoFactorAuth إن وُجدت
        if (window.TwoFactorAuth?.verifyTOTP) {
            return await window.TwoFactorAuth.verifyTOTP(data.totp_secret, token);
        }
        // خطة بديلة بسيطة (غير آمنة، للتطوير فقط)
        console.warn('وحدة TwoFactorAuth غير محملة');
        return false;
    }

    // ─── تسجيل الدخول مع دعم 2FA ──────────────────────────

    /**
     * تسجيل الدخول بكلمة المرور + OTP مع دعم TOTP اختياري
     * @param {string} email
     * @param {string} password
     * @param {string} [totpToken] - رمز TOTP (مطلوب إذا كانت 2FA مفعلة)
     */
    async function loginWithPasswordAndOTP(email, password, totpToken) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');

        // 1. التحقق من كلمة المرور (يُنشئ جلسة مؤقتة)
        const { data, error: signInError } = await sb.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const user = data?.user;
        if (!user) throw new Error('بيانات المستخدم غير متوفرة');

        // 2. التحقق من 2FA إذا كانت مفعلة
        const totpEnabled = await isTOTPEnabled(user.id);
        if (totpEnabled) {
            if (!totpToken) {
                throw new Error('TOTP_REQUIRED'); // رمز خاص للتعامل معه في الواجهة
            }
            const valid = await verifyTOTPCode(user.id, totpToken);
            if (!valid) {
                throw new Error('رمز المصادقة الثنائية غير صحيح');
            }
        }

        // 3. تخزين اسم المستخدم
        if (user.user_metadata?.full_name) {
            sessionStorage.setItem('otpName', user.user_metadata.full_name);
        } else {
            sessionStorage.setItem('otpName', email.split('@')[0]);
        }

        // 4. إنهاء الجلسة المؤقتة
        await sb.auth.signOut();

        // 5. إرسال OTP
        const { error: otpError } = await sb.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false }
        });
        if (otpError) throw otpError;

        // 6. تخزين البريد الإلكتروني للتحقق
        sessionStorage.setItem('otpEmail', email);

        return { success: true, totpEnabled };
    }

    /**
     * التحقق مما إذا كان البريد الإلكتروني يتطلب 2FA
     * (يمكن استخدامها في صفحة تسجيل الدخول قبل إرسال البيانات)
     */
    async function checkTOTPRequired(email) {
        const sb = await getSupabase();
        if (!sb) return false;
        // جلب معرف المستخدم بالبريد
        const { data, error } = await sb.rpc('get_user_id_by_email', { email_input: email });
        if (error || !data) return false;
        return await isTOTPEnabled(data);
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
                if (info && info.userId && info.sessionId) {
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
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
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
        checkTOTPRequired,
        verifyTOTPCode,
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
        watchLocationPermission
    };

    console.log('auth.js v14 (2FA) جاهز');
})();
