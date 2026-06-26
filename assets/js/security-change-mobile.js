/**
 * ============================================================
 * تغيير رقم الجوال - Change Mobile
 * ============================================================
 * الموقع: /assets/js/security-change-mobile.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-mobile'] = {
    init: function() {
        console.log('📱 Initializing Change Mobile page...');

        const form = document.getElementById('changeMobileForm');
        if (!form) {
            console.warn('⚠️ Change Mobile form not found.');
            return;
        }

        const newMobile = document.getElementById('newMobile');
        const confirmMobile = document.getElementById('confirmMobile');
        const newMobileHint = document.getElementById('newMobileHint');
        const confirmHint = document.getElementById('confirmMobileHint');

        // ============================================
        // 1. التحقق من صحة رقم الجوال الجديد (أرقام فقط وطول مناسب)
        // ============================================
        if (newMobile && newMobileHint) {
            newMobile.addEventListener('input', function() {
                const value = this.value.trim();
                const isValid = /^[0-9]{9,12}$/.test(value);

                if (value === '') {
                    newMobileHint.className = 'mobile-hint';
                    newMobileHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل رقم الجوال بدون مفتاح الدولة.';
                    this.style.borderColor = '';
                } else if (isValid) {
                    newMobileHint.className = 'mobile-hint success';
                    newMobileHint.innerHTML = '<i class="fas fa-check-circle"></i> رقم الجوال صحيح.';
                    this.style.borderColor = '#16a34a';
                } else {
                    newMobileHint.className = 'mobile-hint error';
                    newMobileHint.innerHTML = '<i class="fas fa-times-circle"></i> يجب أن يتكون من 9-12 رقم فقط.';
                    this.style.borderColor = '#dc2626';
                }

                // إعادة التحقق من التطابق إذا كان حقل التأكيد يحتوي على قيمة
                if (confirmMobile && confirmMobile.value) {
                    checkMatch();
                }
            });
        }

        // ============================================
        // 2. التحقق من تطابق الرقمين
        // ============================================
        function checkMatch() {
            if (!newMobile || !confirmMobile || !confirmHint) return;

            const newVal = newMobile.value.trim();
            const confirmVal = confirmMobile.value.trim();

            if (confirmVal === '') {
                confirmHint.className = 'mobile-hint';
                confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع رقم الجوال الجديد.';
                confirmMobile.style.borderColor = '';
                return;
            }

            if (newVal === confirmVal && /^[0-9]{9,12}$/.test(confirmVal)) {
                confirmHint.className = 'mobile-hint success';
                confirmHint.innerHTML = '<i class="fas fa-check-circle"></i> الرقمان متطابقان.';
                confirmMobile.style.borderColor = '#16a34a';
            } else {
                confirmHint.className = 'mobile-hint error';
                confirmHint.innerHTML = '<i class="fas fa-times-circle"></i> الرقمان غير متطابقين.';
                confirmMobile.style.borderColor = '#dc2626';
            }
        }

        if (newMobile && confirmMobile && confirmHint) {
            confirmMobile.addEventListener('input', checkMatch);
            // إعادة التحقق عند تغيير الرقم الجديد بعد كتابة التأكيد
            newMobile.addEventListener('input', function() {
                if (confirmMobile.value) checkMatch();
            });
        }

        // ============================================
        // 3. معالج إرسال النموذج
        // ============================================
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const newVal = newMobile.value.trim();
            const confirmVal = confirmMobile.value.trim();

            // التحقق من صحة رقم الجوال الجديد
            if (!newVal || !/^[0-9]{9,12}$/.test(newVal)) {
                Security.showAlert('يرجى إدخال رقم جوال صحيح (9-12 رقم).', 'error');
                newMobile.focus();
                return;
            }

            // التحقق من تطابق الرقمين
            if (newVal !== confirmVal) {
                Security.showAlert('رقم الجوال الجديد وتأكيده غير متطابقين.', 'error');
                confirmMobile.focus();
                return;
            }

            // التأكد من أن الرقم الجديد مختلف عن الحالي
            const currentMobile = document.getElementById('currentMobile');
            if (currentMobile && currentMobile.value === newVal) {
                Security.showAlert('رقم الجوال الجديد مطابق للرقم الحالي. يرجى اختيار رقم آخر.', 'error');
                newMobile.focus();
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            Security.showAlert('✅ تم تغيير رقم الجوال بنجاح. جاري إرسال رمز التحقق...', 'success');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            }

            setTimeout(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير رقم الجوال';
                }
                form.reset();
                // إعادة تعيين التلميحات
                if (newMobileHint) {
                    newMobileHint.className = 'mobile-hint';
                    newMobileHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل رقم الجوال بدون مفتاح الدولة.';
                }
                if (confirmHint) {
                    confirmHint.className = 'mobile-hint';
                    confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع رقم الجوال الجديد.';
                }
                // إعادة تعيين لون الحدود
                if (newMobile) newMobile.style.borderColor = '';
                if (confirmMobile) confirmMobile.style.borderColor = '';

                // إعادة تعيين القيم الافتراضية
                const currentMobileInput = document.getElementById('currentMobile');
                if (currentMobileInput) {
                    currentMobileInput.value = '551234567';
                }
                const currentCountryCode = document.getElementById('currentCountryCode');
                if (currentCountryCode) {
                    currentCountryCode.value = '966';
                }
                const newCountryCode = document.getElementById('newCountryCode');
                if (newCountryCode) {
                    newCountryCode.value = '966';
                }
            }, 3000);
        });

        console.log('✅ Change Mobile page initialized successfully.');
    }
};
