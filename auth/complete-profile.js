/**
 * ============================================================
 * complete-profile.js - إكمال الملف الشخصي (Enterprise)
 * ============================================================
 * الموقع: /assets/js/complete-profile.js
 * - ينتظر جاهزية Supabase.
 * - يتحقق من أن المستخدم مسجل دخول.
 * - يُحدّث بيانات المستخدم (metadata) وسجل auth_register.
 * - ثم يوجه إلى لوحة التحكم.
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('completeProfileForm');
        const fullnameInput = document.getElementById('fullname');
        const usernameInput = document.getElementById('username');
        const countryCodeSelect = document.getElementById('countryCode');
        const mobileInput = document.getElementById('mobile');
        const submitBtn = document.getElementById('submitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');

        if (!form) return;

        // انتظار جاهزية Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
                    document.addEventListener('supabase:ready', (e) => {
                        clearTimeout(timeout);
                        resolve(e.detail.client);
                    }, { once: true });
                    document.addEventListener('supabase:error', () => {
                        clearTimeout(timeout);
                        reject(new Error('فشل تحميل Supabase'));
                    }, { once: true });
                });
            } catch (err) {
                showAlert('تعذر الاتصال بخدمة المصادقة. تأكد من اتصالك بالإنترنت.', 'error');
                return;
            }
        }

        // التأكد من وجود جلسة مستخدم
        const { data: { session } } = await window.teraSupabase.auth.getSession();
        if (!session) {
            showAlert('يجب تسجيل الدخول أولاً للوصول إلى هذه الصفحة.', 'error');
            setTimeout(() => window.location.replace('/auth/login.html'), 2000);
            return;
        }

        const user = session.user;

        // تعبئة بعض الحقول مسبقاً إن وجدت
        if (user.user_metadata?.full_name) fullnameInput.value = user.user_metadata.full_name;
        if (user.user_metadata?.username) usernameInput.value = user.user_metadata.username;
        if (user.user_metadata?.mobile_number) {
            const savedPhone = user.user_metadata.mobile_number;
            if (savedPhone.startsWith('+966')) {
                countryCodeSelect.value = '+966';
                mobileInput.value = savedPhone.substring(4);
            } else {
                mobileInput.value = savedPhone;
            }
        }

        // تقديم النموذج
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // إخفاء التنبيهات السابقة
            hideAlert();
            ['fullname-error', 'username-error', 'mobile-error'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '';
            });

            // قراءة البيانات
            const fullname = fullnameInput.value.trim();
            const username = usernameInput.value.trim();
            const countryCode = countryCodeSelect.value;
            const mobile = mobileInput.value.trim();

            // تحقق من الحقول
            let hasError = false;

            if (!fullname) {
                document.getElementById('fullname-error').textContent = 'الاسم الكامل مطلوب';
                hasError = true;
            } else if (!/^[\u0621-\u064A\s]+$/.test(fullname)) {
                document.getElementById('fullname-error').textContent = 'يجب أن يحتوي على أحرف عربية فقط';
                hasError = true;
            }

            if (!username) {
                document.getElementById('username-error').textContent = 'اسم المستخدم مطلوب';
                hasError = true;
            } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                document.getElementById('username-error').textContent = '3-20 حرف إنجليزي أو رقم';
                hasError = true;
            }

            if (!mobile) {
                document.getElementById('mobile-error').textContent = 'رقم الجوال مطلوب';
                hasError = true;
            } else if (!/^5\d{8}$/.test(mobile)) {
                document.getElementById('mobile-error').textContent = 'رقم جوال غير صحيح (يبدأ بـ 5)';
                hasError = true;
            }

            if (hasError) return;

            const fullPhone = countryCode + mobile;

            // إظهار اللودر
            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            try {
                // 1. تحديث بيانات المستخدم في Auth (metadata)
                const { error: updateUserError } = await window.teraSupabase.auth.updateUser({
                    data: {
                        full_name: fullname,
                        username: username,
                        mobile_number: fullPhone
                    }
                });

                if (updateUserError) throw updateUserError;

                // 2. تحديث جدول auth_register (إن وُجد)
                const { error: updateRegError } = await window.teraSupabase
                    .from('auth_register')
                    .update({
                        full_name: fullname,
                        username: username,
                        mobile_number: fullPhone,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);

                if (updateRegError) {
                    console.warn('⚠️ تعذر تحديث auth_register:', updateRegError);
                }

                // نجاح
                showAlert('✅ تم إكمال ملفك الشخصي بنجاح! جاري التوجيه...', 'success');

                // توجيه إلى لوحة التحكم
                setTimeout(() => {
                    window.location.replace('/pages/dashboard/index.html');
                }, 1500);

            } catch (error) {
                console.error('❌ خطأ أثناء إكمال الملف الشخصي:', error);
                showAlert(error.message || 'تعذر حفظ البيانات. حاول مرة أخرى.', 'error');
            } finally {
                showLoader(false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> إكمال التسجيل';
            }
        });

        // دوال مساعدة
        function showAlert(message, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success'
                    ? '<i class="fas fa-check-circle"></i>'
                    : '<i class="fas fa-exclamation-circle"></i>';
            }
            alertMessage.textContent = message;
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(() => alertBox.classList.remove('show'), 8000);
        }

        function hideAlert() {
            if (!alertBox) return;
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }

        function showLoader(show) {
            if (!loaderOverlay) return;
            loaderOverlay.style.display = show ? 'flex' : 'none';
            const progressBar = document.getElementById('progressFillBar');
            if (show && progressBar) {
                progressBar.style.width = '0%';
                setTimeout(() => { progressBar.style.width = '70%'; }, 500);
                setTimeout(() => { progressBar.style.width = '90%'; }, 1500);
            } else if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
    });
})();
