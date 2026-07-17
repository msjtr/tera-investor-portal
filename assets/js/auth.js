/**
 * auth.js – v27 (كامل – يدعم loginWithPassword / loginWithTOTP / OTP)
 */
(function() {
    'use strict';

    let supabase;
    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        if (!supabase) throw new Error('Supabase غير متوفر');
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

    // 1. Authentication (Core)
    async function login(email, password) {
        const sb = await getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
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
        localStorage.clear();
        sessionStorage.clear();
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

    // 2. Email OTP
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

    // 3. Two‑Factor (TOTP)
    const TOTP_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/two-factor';

    async function callTOTPFunction(endpoint, body = {}, session = null) {
        const sb = await getSupabase();
        let currentSession = session;
        if (!currentSession) {
            const { data } = await sb.auth.getSession();
            currentSession = data.session;
        }
        if (!currentSession) throw new Error('NO_SESSION');

        const makeRequest = async (sess) => {
            const res = await fetch(`${TOTP_FUNCTION_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sess.access_token}`
                },
                body: JSON.stringify(body)
            });
            if (res.status === 401) {
                const { data: { session: newSession }, error: refreshError } = await sb.auth.refreshSession();
                if (!refreshError && newSession) return makeRequest(newSession);
                throw new Error('SESSION_EXPIRED');
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'فشل الطلب');
            }
            return res.json();
        };
        return makeRequest(currentSession);
    }

    async function setupTwoFactor() { return await callTOTPFunction('setup', {}); }
    async function enableTwoFactor(code) { return await callTOTPFunction('enable', { code }); }
    async function getTwoFactorStatus() { return await callTOTPFunction('status'); }
    async function verifyTwoFactor(code, isBackup = false) { return await callTOTPFunction('verify', { code, is_backup: isBackup }); }
    async function disableTwoFactor(code) { return await callTOTPFunction('disable', { code }); }
    async function regenerateBackupCodes(code) { return await callTOTPFunction('regenerate-backup-codes', { code }); }

    // 4. Smart Login
    const MAX_ATTEMPTS = 5;
    function getLoginAttempts() { return parseInt(sessionStorage.getItem('loginAttempts') || '0'); }
    function incrementLoginAttempts() { sessionStorage.setItem('loginAttempts', getLoginAttempts() + 1); }
    function resetLoginAttempts() { sessionStorage.setItem('loginAttempts', '0'); }

    async function loginWithPassword(email, password) {
        const sb = await getSupabase();
        if (getLoginAttempts() >= MAX_ATTEMPTS) {
            throw new Error('تم تجاوز عدد المحاولات المسموح بها. يرجى استخدام المصادقة الثنائية.');
        }
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) { incrementLoginAttempts(); throw error; }
            const user = data.user;
            let isTOTPEnabled = false;
            try {
                const status = await callTOTPFunction('status', {}, data.session);
                isTOTPEnabled = status?.is_enabled || false;
            } catch (e) { console.warn('تعذر التحقق من TOTP:', e); }

            if (isTOTPEnabled) {
                return { requiresTwoFactor: true, email };
            }
            resetLoginAttempts();
            return { success: true, user };
        } catch (e) {
            if (getLoginAttempts() >= MAX_ATTEMPTS) throw new Error('تم تجاوز عدد المحاولات. يرجى استخدام المصادقة الثنائية.');
            throw e;
        }
    }

    async function completeLoginWithTOTP(code) {
        const sb = await getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
        await callTOTPFunction('verify', { code }, session);
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error('فشل في استرداد المستخدم بعد التحقق.');
        resetLoginAttempts();
        return { success: true, user };
    }

    async function loginWithTOTP(email, token) {
        const res = await fetch(`${TOTP_FUNCTION_URL}/verify-totp-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'فشل التحقق من رمز TOTP');
        }
        const { session } = await res.json();
        if (!session) throw new Error('فشل إنشاء الجلسة');
        const sb = await getSupabase();
        await sb.auth.setSession(session);
        resetLoginAttempts();
        return { success: true };
    }

    async function cancelTOTPLogin() {
        const sb = await getSupabase();
        try { await sb.auth.signOut(); } catch (e) { console.warn('فشل تسجيل الخروج أثناء إلغاء TOTP:', e); }
    }

    // 5. Password
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

    // 6. User & Session
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        const sb = await getSupabase();
        if (!sb) { window.location.replace(redirectUrl); return null; }
        try {
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) { await logout(); return null; }
            return user;
        } catch (e) { await logout(); return null; }
    }

    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            if (!sb) return;
            sb.auth.onAuthStateChange((event, session) => callback(event, session));
        });
    }

    window.Auth = {
        login, logout, getSession, getUser, isSessionValid,
        sendOTP, verifyOTP,
        setupTwoFactor, enableTwoFactor, verifyTwoFactor, disableTwoFactor, regenerateBackupCodes, getTwoFactorStatus,
        loginWithPassword, completeLoginWithTOTP, loginWithTOTP, cancelTOTPLogin,
        resetPassword, updatePassword,
        requireAuth, onAuthStateChange, validatePassword
    };

    console.log('✅ auth.js v27 جاهز');
})();
