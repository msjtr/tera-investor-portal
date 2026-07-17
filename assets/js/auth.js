/**
 * auth.js – v26 (يدعم loginWithTOTP الآمن)
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

    async function logout() { /* unchanged */ }
    async function getSession() { /* unchanged */ }
    async function getUser() { /* unchanged */ }
    async function isSessionValid() { /* unchanged */ }

    // 2. Email OTP
    async function sendOTP(email) { /* unchanged */ }
    async function verifyOTP(email, token) { /* unchanged */ }

    // 3. Two‑Factor (TOTP)
    const TOTP_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/two-factor';

    async function callTOTPFunction(endpoint, body = {}, session = null) { /* unchanged */ }

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

    // 🆕 تسجيل الدخول المباشر بـ TOTP (بدون كلمة مرور)
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

    async function cancelTOTPLogin() { /* unchanged */ }

    // 5. Password
    async function resetPassword(email) { /* unchanged */ }
    async function updatePassword(newPassword) { /* unchanged */ }

    // 6. User & Session
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') { /* unchanged */ }
    function onAuthStateChange(callback) { /* unchanged */ }

    window.Auth = {
        login, logout, getSession, getUser, isSessionValid,
        sendOTP, verifyOTP,
        setupTwoFactor, enableTwoFactor, verifyTwoFactor, disableTwoFactor, regenerateBackupCodes, getTwoFactorStatus,
        loginWithPassword, completeLoginWithTOTP, loginWithTOTP, cancelTOTPLogin,
        resetPassword, updatePassword,
        requireAuth, onAuthStateChange, validatePassword
    };

    console.log('✅ auth.js v26 (مع loginWithTOTP) جاهز');
})();
