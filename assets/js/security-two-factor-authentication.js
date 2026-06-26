/**
 * ============================================================
 * المصادقة الثنائية (2FA) - Two Factor Authentication
 * ============================================================
 * الموقع: /assets/js/security-two-factor-authentication.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['two-factor-authentication'] = {
    init: function() {
        console.log('🔐 Initializing Two-Factor Authentication page...');

        const form = document.getElementById('twoFactorForm');
        if (!form) {
            console.warn('⚠️ 2FA form not found.');
            return;
        }

        // ============================================
        // المتغيرات والعناصر
        // ============================================
        let is2FAEnabled = false;

        const statusBadge = document.getElementById('statusBadge');
        const statusText = document.getElementById('statusText');
        const enableBtn = document.getElementById('enable2faBtn');
        const disableBtn = document.getElementById('disable2faBtn');
        const setupSection = document.getElementById('setupSection');
        const recoverySection = document.getElementById('recoverySection');
        const verifyCode = document.getElementById('verifyCode');
        const verifyCodeHint = document.getElementById('verifyCodeHint');
        const verifyAndEnableBtn = document.getElementById('verifyAndEnableBtn');
        const copySecretBtn = document.getElementById('copySecretBtn');
        const secretKey = document.getElementById('secretKey');
        const copyCodesBtn = document.getElementById('copyCodesBtn');
        const regenerateCodesBtn = document.getElementById('regenerateCodesBtn');

        // ============================================
        // 1. تحديث حالة المصادقة الثنائية (واجهة المستخدم)
        // ============================================
        function updateUI() {
            if (is2FAEnabled) {
                statusBadge.className = 'status-badge-lg active';
                statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> <span id="statusText">مفعلة</span>';
                statusText.textContent = 'مفعلة';
                enableBtn.style.display = 'none';
                disableBtn.style.display = 'flex';
                setupSection.style.display = 'none';
                recoverySection.style.display = 'block';
                document.getElementById('setupSection').style.display = 'none';
            } else {
                statusBadge.className = 'status-badge-lg inactive';
                statusBadge.innerHTML = '<i class="fas fa-times-circle"></i> <span id="statusText">غير مفعلة</span>';
                statusText.textContent = 'غير مفعلة';
                enableBtn.style.display = 'flex';
                disableBtn.style.display = 'none';
                setupSection.style.display = 'none';
                recoverySection.style.display = 'none';
                document.getElementById('setupSection').style.display = 'none';
            }
        }

        // ============================================
        // 2. تفعيل المصادقة الثنائية (إظهار خطوات الإعداد)
        // ============================================
        if (enableBtn) {
            enableBtn.addEventListener('click', function() {
                if (is2FAEnabled) return;

                // إظهار قسم الإعداد
                setupSection.style.display = 'block';
                setupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // توليد مفتاح سري جديد (محاكاة)
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                let secret = '';
                for (let i = 0; i < 20; i++) {
                    secret += chars.charAt(Math.floor(Math.random() * chars.length));
                    if ((i + 1) % 4 === 0 && i < 19) secret += '-';
                }
                secretKey.textContent = secret;

                Security.showAlert('📱 قم بمسح رمز QR أو إدخال المفتاح السري في تطبيق المصادقة الخاص بك.', 'info');
            });
        }

        // ============================================
        // 3. التحقق من رمز المصادقة وتفعيل 2FA
        // ============================================
        if (verifyAndEnableBtn) {
            verifyAndEnableBtn.addEventListener('click', function() {
                const code = verifyCode.value.trim();

                if (code.length !== 6) {
                    Security.showAlert('يرجى إدخال رمز التحقق المكون من 6 أرقام.', 'error');
                    verifyCodeHint.className = 'format-hint error';
                    verifyCodeHint.textContent = '⚠️ يجب إدخال 6 أرقام بالضبط.';
                    verifyCode.style.borderColor = '#dc2626';
                    return;
                }

                // محاكاة التحقق من الرمز (في الواقع يتم التحقق من صحة الرمز مع الخادم)
                // نستخدم رمز ثابت للاختبار: 123456
                if (code === '123456') {
                    is2FAEnabled = true;
                    updateUI();
                    Security.showAlert('✅ تم تفعيل المصادقة الثنائية بنجاح!', 'success');
                    verifyCodeHint.className = 'format-hint';
                    verifyCodeHint.textContent = '✅ تم التحقق بنجاح.';
                    verifyCode.style.borderColor = '#16a34a';
                    verifyCode.value = '';

                    // إظهار رموز الاسترداد
                    recoverySection.style.display = 'block';
                    recoverySection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // توليد رموز استرداد جديدة
                    generateBackupCodes();
                } else {
                    Security.showAlert('❌ رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.', 'error');
                    verifyCodeHint.className = 'format-hint error';
                    verifyCodeHint.textContent = '⚠️ الرمز غير صحيح. جرب 123456 للاختبار.';
                    verifyCode.style.borderColor = '#dc2626';
                    verifyCode.value = '';
                    verifyCode.focus();
                }
            });
        }

        // ============================================
        // 4. إلغاء تفعيل المصادقة الثنائية
        // ============================================
        if (disableBtn) {
            disableBtn.addEventListener('click', function() {
                if (confirm('هل أنت متأكد من إلغاء تفعيل المصادقة الثنائية؟ هذا سيقلل من أمان حسابك.')) {
                    is2FAEnabled = false;
                    updateUI();
                    Security.showAlert('🔴 تم إلغاء تفعيل المصادقة الثنائية.', 'info');
                }
            });
        }

        // ============================================
        // 5. نسخ المفتاح السري
        // ============================================
        if (copySecretBtn && secretKey) {
            copySecretBtn.addEventListener('click', function() {
                const text = secretKey.textContent;
                navigator.clipboard.writeText(text).then(function() {
                    Security.showAlert('✅ تم نسخ المفتاح السري.', 'success');
                }).catch(function() {
                    // Fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    Security.showAlert('✅ تم نسخ المفتاح السري.', 'success');
                });
            });
        }

        // ============================================
        // 6. توليد رموز استرداد عشوائية
        // ============================================
        function generateBackupCodes() {
            const codes = [];
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            for (let i = 0; i < 6; i++) {
                let code = '';
                for (let j = 0; j < 4; j++) {
                    for (let k = 0; k < 4; k++) {
                        code += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    if (j < 3) code += '-';
                }
                codes.push(code);
            }
            const grid = document.getElementById('backupCodesGrid');
            if (grid) {
                grid.innerHTML = codes.map(c => `<div class="code-item">${c}</div>`).join('');
            }
            return codes;
        }

        // ============================================
        // 7. نسخ رموز الاسترداد
        // ============================================
        if (copyCodesBtn) {
            copyCodesBtn.addEventListener('click', function() {
                const items = document.querySelectorAll('#backupCodesGrid .code-item');
                const codes = Array.from(items).map(el => el.textContent).join('\n');
                const text = 'رموز استرداد المصادقة الثنائية:\n\n' + codes + '\n\nاحتفظ بها في مكان آمن.';

                navigator.clipboard.writeText(text).then(function() {
                    Security.showAlert('✅ تم نسخ رموز الاسترداد.', 'success');
                }).catch(function() {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    Security.showAlert('✅ تم نسخ رموز الاسترداد.', 'success');
                });
            });
        }

        // ============================================
        // 8. إنشاء رموز استرداد جديدة
        // ============================================
        if (regenerateCodesBtn) {
            regenerateCodesBtn.addEventListener('click', function() {
                if (confirm('سيتم إنشاء رموز استرداد جديدة، وستصبح الرموز القديمة غير صالحة للاستخدام. هل أنت متأكد؟')) {
                    generateBackupCodes();
                    Security.showAlert('🔄 تم إنشاء رموز استرداد جديدة.', 'success');
                }
            });
        }

        // ============================================
        // 9. التحقق من صحة رمز المصادقة عند الكتابة
        // ============================================
        if (verifyCode) {
            verifyCode.addEventListener('input', function() {
                const value = this.value.trim();
                if (value.length === 6) {
                    verifyCodeHint.className = 'format-hint';
                    verifyCodeHint.textContent = '✅ رمز مكتمل. اضغط "تأكيد وتفعيل" للمتابعة.';
                    verifyCodeHint.style.color = '#16a34a';
                    this.style.borderColor = '#16a34a';
                } else if (value.length > 0) {
                    verifyCodeHint.className = 'format-hint';
                    verifyCodeHint.textContent = `⚠️ أدخل ${6 - value.length} أرقام متبقية.`;
                    verifyCodeHint.style.color = '#f59e0b';
                    this.style.borderColor = '#f59e0b';
                } else {
                    verifyCodeHint.className = 'format-hint';
                    verifyCodeHint.textContent = 'أدخل الرمز الظاهر في تطبيق المصادقة.';
                    verifyCodeHint.style.color = '#64748b';
                    this.style.borderColor = '';
                }
            });
        }

        // ============================================
        // 10. التهيئة الأولية
        // ============================================
        // تعيين الحالة الأولية (محاكاة: غير مفعلة)
        is2FAEnabled = false;
        updateUI();

        console.log('✅ Two-Factor Authentication page initialized successfully.');
    }
};
