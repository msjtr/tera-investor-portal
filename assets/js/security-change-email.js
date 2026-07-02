/**
 * security-change-email.js – تغيير البريد الإلكتروني (رسمي + تحقق محسَّن)
 * يعتمد على security.js الذي يوفر waitForSupabase() و showSecurityAlert() و updateHeader()
 */
(function() {
    'use strict';

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages['change-email'] = {
        init: async function() {
            console.log('📧 تهيئة صفحة تغيير البريد الإلكتروني...');
            let supabase;
            try { supabase = await waitForSupabase(); } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showSecurityAlert('يجب تسجيل الدخول أولاً.', 'error');
                setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
                return;
            }
            updateHeader(user);

            const currentEmail = user.email;
            document.getElementById('currentEmailDisplay').textContent = currentEmail;

            // عناصر DOM – المرحلة 1
            const currentPasswordInput = document.getElementById('currentPassword');
            const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
            const step1Error = document.getElementById('step1Error');
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');

            // عناصر DOM – المرحلة 2
            const newEmailInput = document.getElementById('newEmail');
            const confirmEmailInput = document.getElementById('confirmEmail');
            const changeEmailBtn = document.getElementById('changeEmailBtn');

            // دالة مساعدة للتحقق من صيغة البريد
            function isValidEmail(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            }

            // ========== المرحلة 1: التحقق من كلمة المرور ==========
            verifyPasswordBtn.addEventListener('click', async function() {
                const password = currentPasswordInput.value.trim();
                if (!password) {
                    step1Error.textContent = 'يرجى إدخال كلمة المرور الحالية.';
                    step1Error.style.display = 'block';
                    return;
                }

                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
                step1Error.style.display = 'none';

                try {
                    const { error } = await supabase.auth.signInWithPassword({
                        email: currentEmail,
                        password: password
                    });
                    if (error) throw error;
                    showSecurityAlert('تم التحقق من هويتك بنجاح.', 'success');
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                } catch (err) {
                    console.error('فشل التحقق من كلمة المرور:', err);
                    step1Error.textContent = 'كلمة المرور غير صحيحة.';
                    step1Error.style.display = 'block';
                } finally {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-check-circle"></i> تحقق من هويتك';
                }
            });

            // ========== المرحلة 2: تغيير البريد مع تحقق محسَّن ==========
            if (changeEmailBtn) {
                changeEmailBtn.addEventListener('click', async function() {
                    const newEmail = newEmailInput.value.trim().toLowerCase();
                    const confirm = confirmEmailInput.value.trim().toLowerCase();

                    // التحقق من تعبئة الحقول
                    if (!newEmail || !confirm) {
                        showSecurityAlert('يرجى ملء جميع الحقول.', 'error');
                        return;
                    }

                    // التحقق من الصيغة
                    if (!isValidEmail(newEmail)) {
                        showSecurityAlert('صيغة البريد الإلكتروني الجديد غير صالحة.', 'error');
                        return;
                    }

                    if (newEmail !== confirm) {
                        showSecurityAlert('البريد الإلكتروني غير متطابق.', 'error');
                        return;
                    }

                    if (newEmail === currentEmail.toLowerCase()) {
                        showSecurityAlert('البريد الجديد مطابق للحالي.', 'error');
                        return;
                    }

                    this.disabled = true;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';

                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('انتهت الجلسة. يرجى إعادة تسجيل الدخول.');
                        }

                        const redirectTo = `${window.location.origin}/pages/security/confirm-email.html`;
                        console.log('البريد الجديد:', newEmail);

                        const { data, error } = await supabase.auth.updateUser(
                            { email: newEmail },
                            { emailRedirectTo: redirectTo }
                        );

                        console.log('DATA:', data);
                        console.log('ERROR:', error);

                        if (error) {
                            console.log('error.message:', error.message);
                            console.log('error.status:', error.status);
                            console.log('error.code:', error.code);
                            throw error;
                        }

                        showSecurityAlert('✅ تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد. يرجى التحقق منه (والبريد العشوائي) لإكمال التغيير.', 'success');
                        setTimeout(() => window.location.replace('/pages/dashboard/index.html'), 4000);

                    } catch (err) {
                        console.error('❌ فشل تغيير البريد:', err);
                        let userMessage = 'فشل تغيير البريد.';
                        if (err.message) {
                            if (err.message.includes('already exists')) {
                                userMessage = 'البريد الإلكتروني الجديد مستخدم بالفعل.';
                            } else if (err.message.includes('invalid format')) {
                                userMessage = 'صيغة البريد الإلكتروني غير صالحة. تأكد من صحة البريد.';
                            } else if (err.message.includes('rate limit')) {
                                userMessage = 'تم تجاوز عدد المحاولات. يرجى الانتظار قليلاً.';
                            } else if (err.message.includes('redirect') || err.message.includes('URL')) {
                                userMessage = 'خطأ في إعدادات رابط التأكيد.';
                            } else {
                                userMessage = err.message;
                            }
                        }
                        showSecurityAlert(userMessage, 'error');
                    } finally {
                        this.disabled = false;
                        this.innerHTML = '<i class="fas fa-check-circle"></i> تغيير البريد الإلكتروني';
                    }
                });
            }
        }
    };
})();
