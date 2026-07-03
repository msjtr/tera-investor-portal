/**
 * security-change-password.js
 * صفحة تغيير كلمة المرور – مع إصلاح مشكلة الخروج من النظام
 */

'use strict';

(function() {
    let supabase = null;
    let currentUser = null;
    let isCurrentPasswordValid = false;
    let isOtpVerified = false;
    let timerInterval = null;
    let timerSeconds = 300;
    let isSendingOtp = false;
    let isSaving = false;
    let initialized = false;

    // عناصر DOM (نفس الكود السابق)
    const emailDisplay = document.getElementById('userEmail');
    const currentPasswordInput = document.getElementById('currentPassword');
    const currentPasswordHint = document.getElementById('currentPasswordHint');
    const currentPasswordIcon = document.getElementById('currentPasswordIcon');
    const currentPasswordMessage = document.getElementById('currentPasswordMessage');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const newPasswordHint = document.getElementById('newPasswordHint');
    const confirmPasswordHint = document.getElementById('confirmPasswordHint');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpSendGroup = document.getElementById('otpSendGroup');
    const timerContainer = document.getElementById('timerContainer');
    const timerDisplay = document.getElementById('timerDisplay');
    const otpVerifyGroup = document.getElementById('otpVerifyGroup');
    const otpCodeInput = document.getElementById('otpCode');
    const otpHint = document.getElementById('otpHint');
    const otpIcon = document.getElementById('otpIcon');
    const otpMessage = document.getElementById('otpMessage');
    const saveGroup = document.getElementById('saveGroup');
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    const alertBox = document.getElementById('formAlert');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');

    const successModal = document.getElementById('successModal');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const successGoNow = document.getElementById('successGoNow');
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const errorRetryBtn = document.getElementById('errorRetryBtn');
    const errorCloseBtn = document.getElementById('errorCloseBtn');

    // ===== دوال مساعدة =====
    async function initSupabase() {
        // محاولة استخدام SecurityCore أولاً
        if (window.SecurityCore) {
            try {
                const user = await window.SecurityCore.init();
                if (user) {
                    supabase = window.SecurityCore.supabase;
                    currentUser = user;
                    return true;
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل SecurityCore.init:', e);
            }
        }

        // محاولة استخدام TeraAuth
        if (window.TeraAuth) {
            try {
                if (!window.TeraAuth._initialized) await window.TeraAuth.init();
                if (window.TeraAuth._client) {
                    supabase = window.TeraAuth._client;
                    const user = await window.TeraAuth.getUser();
                    if (user) {
                        currentUser = user;
                        return true;
                    }
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل TeraAuth:', e);
            }
        }

        // محاولة استخدام waitForSupabase
        if (typeof waitForSupabase === 'function') {
            try {
                supabase = await waitForSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    currentUser = user;
                    return true;
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل waitForSupabase:', e);
            }
        }

        return false;
    }

    function updateHeaderUI(user) {
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (!user) return;
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        if (nameEl) nameEl.textContent = fullName;
        if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
    }

    function showAlert(message, type = 'error') {
        if (!alertBox) return;
        alertBox.className = `alert-box show ${type}`;
        alertIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        alertMessage.textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }, 7000);
    }

    function showErrorModal(message) {
        if (!errorModal) return;
        errorMessage.textContent = message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        errorModal.classList.add('show');
    }

    function hideErrorModal() {
        if (errorModal) errorModal.classList.remove('show');
    }

    function showSuccessModal() {
        if (!successModal) return;
        successModal.classList.add('show');
        let count = 5;
        countdownDisplay.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                window.location.replace('/pages/dashboard/index.html');
                return;
            }
            countdownDisplay.textContent = count;
        }, 1000);
        successGoNow.onclick = function() {
            clearInterval(interval);
            window.location.replace('/pages/dashboard/index.html');
        };
    }

    // ===== دوال التحقق وتغيير كلمة المرور (نفس الكود السابق) =====
    // ... (جميع الدوال السابقة: verifyCurrentPassword, toggleNewPasswordFields, validatePasswordStrength, validateConfirmMatch, sendOtp, startTimer, verifyOtp, saveNewPassword, resetForm) ...

    // تم حذف التكرار للاختصار، لكن يجب تضمينها كما هي من الكود السابق

    // ===== تهيئة الصفحة (تم تعديلها) =====
    async function initPage() {
        if (initialized) return;
        initialized = true;

        // محاولة تهيئة Supabase والحصول على المستخدم
        const success = await initSupabase();

        if (!success || !currentUser) {
            // إذا لم يكن هناك مستخدم، نعرض نافذة خطأ مع خيار إعادة المحاولة وتسجيل الدخول
            showErrorModal('لم يتم التعرف على جلسة المستخدم. يرجى تسجيل الدخول مرة أخرى.');
            // إضافة زر لتسجيل الدخول
            const retryBtn = document.getElementById('errorRetryBtn');
            if (retryBtn) {
                retryBtn.textContent = 'تسجيل الدخول';
                retryBtn.onclick = function() {
                    window.location.replace('/auth/auth/login/login.html');
                };
            }
            return;
        }

        // استعادة زر إعادة المحاولة لوظيفته الأصلية
        const retryBtn = document.getElementById('errorRetryBtn');
        if (retryBtn) {
            retryBtn.textContent = 'إعادة المحاولة';
            retryBtn.onclick = function() {
                hideErrorModal();
                if (!timerInterval) {
                    sendOtpBtn.style.display = 'block';
                    timerContainer.style.display = 'none';
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
                }
                otpCodeInput.disabled = false;
                otpCodeInput.value = '';
                otpIcon.className = 'validation-icon';
                otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك';
                otpHint.className = 'format-hint';
                isOtpVerified = false;
                saveGroup.style.display = 'none';
            };
        }

        // عرض البريد الإلكتروني
        emailDisplay.value = currentUser.email || '';
        updateHeaderUI(currentUser);

        // ربط الأحداث (نفس الكود السابق)
        // ... ربط الأحداث ...

        console.log('✅ صفحة تغيير كلمة المرور جاهزة.');
    }

    // ===== بدء التشغيل =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

})();
