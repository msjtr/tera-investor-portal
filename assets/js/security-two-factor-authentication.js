/**
 * ============================================================
 * TERA INVESTOR PORTAL - 2FA (نسخة المؤسسات - Enterprise)
 * ============================================================
 * الموقع: /assets/js/security-two-factor-authentication.js
 * التحديثات:
 * - إزالة جميع المحاكاة وبيانات الاختبار.
 * - ربط حقيقي مع محرك TeraAuth وسحابة Supabase.
 * - عمليات غير متزامنة مع حماية واجهة المستخدم أثناء الاتصال.
 * - توليد مفاتيح ورموز استرداد حقيقية عبر الخادم.
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['two-factor-authentication'] = {
    init: async function() {
        console.log('🔐 [Security] تهيئة نظام المصادقة الثنائية (Enterprise Version)...');

        const form = document.getElementById('twoFactorForm');
        if (!form) {
            console.warn('⚠️ [Security] لم يتم العثور على نموذج المصادقة الثنائية.');
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
                statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> <span>مفعلة</span>';
                statusText.textContent = 'مفعلة';
                enableBtn.style.display = 'none';
                disableBtn.style.display = 'flex';
                setupSection.style.display = 'none';
                recoverySection.style.display = 'block';
            } else {
                statusBadge.className = 'status-badge-lg inactive';
                statusBadge.innerHTML = '<i class="fas fa-times-circle"></i> <span>غير مفعلة</span>';
                statusText.textContent = 'غير مفعلة';
                enableBtn.style.display = 'flex';
                disableBtn.style.display = 'none';
                setupSection.style.display = 'none';
                recoverySection.style.display = 'none';
            }
        }

        // ============================================
        // 2. تفعيل المصادقة الثنائية (جلب المفتاح من الخادم)
        // ============================================
        if (enableBtn) {
            enableBtn.addEventListener('click', async function() {
                if (is2FAEnabled) return;

                enableBtn.disabled = true;
                enableBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحضير...';

                try {
                    // الاتصال الحقيقي بخادم المصادقة لتوليد المفتاح
                    if (!window.TeraAuth || typeof window.TeraAuth.generate2FASecret !== 'function') {
                        throw new Error('خدمة المصادقة الثنائية غير متوفرة حالياً.');
                    }

                    const response = await window.TeraAuth.generate2FASecret();
                    secretKey.textContent = response.secret;

                    // إذا كان الخادم يعيد رابط QR يمكن عرضه هنا (اختياري)
                    // if (response.qr_code_url) { ... }

                    setupSection.style.display = 'block';
                    setupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    if (window.Security && typeof window.Security.showAlert === 'function') {
                        window.Security.showAlert('📱 قم بمسح رمز QR أو إدخال المفتاح السري في تطبيق المصادقة الخاص بك.', 'info');
                    }
                } catch (error) {
                    console.error('❌ خطأ في توليد مفتاح 2FA:', error);
                    alert(error.message || 'تعذر الاتصال بالخادم لتوليد المفتاح السري. يرجى المحاولة لاحقاً.');
                } finally {
                    enableBtn.disabled = false;
                    enableBtn.innerHTML = 'تفعيل المصادقة الثنائية';
                }
            });
        }

        // ============================================
        // 3. التحقق من رمز المصادقة وتفعيل 2FA فعلياً
        // ============================================
        if (verifyAndEnableBtn) {
            verifyAndEnableBtn.addEventListener('click', async function() {
                const code = verifyCode.value.trim();

                if (code.length !== 6 || isNaN(code)) {
                    showInputError('⚠️ يجب إدخال 6 أرقام بالضبط.');
                    return;
                }

                const originalText = verifyAndEnableBtn.innerHTML;
                verifyAndEnableBtn.disabled = true;
                verifyAndEnableBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
                verifyCode.disabled = true;

                try {
                    if (!window.TeraAuth || typeof window.TeraAuth.verify2FA !== 'function') {
                        throw new Error('خدمة التحقق الثنائي غير متوفرة.');
                    }

                    const isVerified = await window.TeraAuth.verify2FA(code);

                    if (isVerified) {
                        is2FAEnabled = true;
                        updateUI();

                        if (window.Security) window.Security.showAlert('✅ تم تفعيل المصادقة الثنائية بنجاح!', 'success');
                        showInputSuccess('✅ تم التحقق بنجاح.');

                        // جلب رموز الاسترداد الحقيقية من الخادم
                        await fetchAndDisplayBackupCodes();
                        recoverySection.style.display = 'block';
                        recoverySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        showInputError('❌ رمز التحقق غير صحيح أو منتهي الصلاحية.');
                        if (window.Security) window.Security.showAlert('❌ رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.', 'error');
                    }
                } catch (error) {
                    console.error('❌ خطأ أثناء التحقق من الرمز:', error);
                    showInputError(error.message || '⚠️ حدث خطأ في الاتصال بالخادم.');
                } finally {
                    verifyAndEnableBtn.disabled = false;
                    verifyAndEnableBtn.innerHTML = originalText;
                    verifyCode.disabled = false;
                    if (!is2FAEnabled) verifyCode.focus();
                }
            });
        }

        // ============================================
        // 4. إلغاء تفعيل المصادقة الثنائية
        // ============================================
        if (disableBtn) {
            disableBtn.addEventListener('click', async function() {
                if (!confirm('هل أنت متأكد من إلغاء تفعيل المصادقة الثنائية؟ هذا سيقلل من أمان حسابك.')) return;

                disableBtn.disabled = true;
                disableBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإلغاء...';

                try {
                    if (!window.TeraAuth || typeof window.TeraAuth.disable2FA !== 'function') {
                        throw new Error('خدمة المصادقة غير متوفرة.');
                    }

                    await window.TeraAuth.disable2FA();
                    is2FAEnabled = false;
                    updateUI();
                    if (window.Security) window.Security.showAlert('🔴 تم إلغاء تفعيل المصادقة الثنائية.', 'info');
                } catch (error) {
                    console.error('❌ خطأ في إلغاء التفعيل:', error);
                    alert(error.message || 'حدث خطأ أثناء محاولة إلغاء التفعيل. يرجى المحاولة لاحقاً.');
                } finally {
                    disableBtn.disabled = false;
                    disableBtn.innerHTML = 'إلغاء التفعيل';
                }
            });
        }

        // ============================================
        // 5. وظائف مساعدة (نسخ المفتاح، رموز الاسترداد)
        // ============================================

        if (copySecretBtn && secretKey) {
            copySecretBtn.addEventListener('click', () => copyToClipboard(secretKey.textContent, 'المفتاح السري'));
        }

        if (copyCodesBtn) {
            copyCodesBtn.addEventListener('click', () => {
                const items = document.querySelectorAll('#backupCodesGrid .code-item');
                const codes = Array.from(items).map(el => el.textContent).join('\n');
                copyToClipboard('رموز استرداد المصادقة الثنائية:\n\n' + codes + '\n\nاحتفظ بها في مكان آمن.', 'رموز الاسترداد');
            });
        }

        if (regenerateCodesBtn) {
            regenerateCodesBtn.addEventListener('click', async function() {
                if (!confirm('سيتم إنشاء رموز استرداد جديدة، وستصبح الرموز القديمة غير صالحة. هل أنت متأكد؟')) return;

                regenerateCodesBtn.disabled = true;
                try {
                    await fetchAndDisplayBackupCodes();
                    if (window.Security) window.Security.showAlert('🔄 تم إنشاء رموز استرداد جديدة.', 'success');
                } catch (error) {
                    alert(error.message || 'تعذر إنشاء رموز جديدة.');
                } finally {
                    regenerateCodesBtn.disabled = false;
                }
            });
        }

        if (verifyCode) {
            verifyCode.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
                const value = this.value;
                if (value.length === 6) {
                    showInputSuccess('✅ رمز مكتمل. اضغط "تأكيد وتفعيل" للمتابعة.');
                } else if (value.length > 0) {
                    showInputWarning(`⚠️ أدخل ${6 - value.length} أرقام متبقية.`);
                } else {
                    resetInputHint();
                }
            });
        }

        // ============================================
        // الدوال المساعدة للواجهة والتنسيق
        // ============================================

        function showInputError(msg) {
            verifyCodeHint.className = 'format-hint error';
            verifyCodeHint.textContent = msg;
            verifyCodeHint.style.color = '#dc2626';
            verifyCode.style.borderColor = '#dc2626';
            verifyCode.value = '';
        }

        function showInputSuccess(msg) {
            verifyCodeHint.className = 'format-hint success';
            verifyCodeHint.textContent = msg;
            verifyCodeHint.style.color = '#16a34a';
            verifyCode.style.borderColor = '#16a34a';
        }

        function showInputWarning(msg) {
            verifyCodeHint.className = 'format-hint warning';
            verifyCodeHint.textContent = msg;
            verifyCodeHint.style.color = '#f59e0b';
            verifyCode.style.borderColor = '#f59e0b';
        }

        function resetInputHint() {
            verifyCodeHint.className = 'format-hint';
            verifyCodeHint.textContent = 'أدخل الرمز الظاهر في تطبيق المصادقة.';
            verifyCodeHint.style.color = '#64748b';
            verifyCode.style.borderColor = '';
        }

        function copyToClipboard(text, itemLabel) {
            navigator.clipboard.writeText(text).then(function() {
                if (window.Security) window.Security.showAlert(`✅ تم نسخ ${itemLabel} بنجاح.`, 'success');
            }).catch(function() {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                if (window.Security) window.Security.showAlert(`✅ تم نسخ ${itemLabel} بنجاح.`, 'success');
            });
        }

        async function fetchAndDisplayBackupCodes() {
            if (window.TeraAuth && typeof window.TeraAuth.generateBackupCodes === 'function') {
                const codes = await window.TeraAuth.generateBackupCodes();
                displayCodes(codes);
            } else {
                throw new Error('خدمة استرداد الرموز غير متوفرة.');
            }
        }

        function displayCodes(codesArray) {
            const grid = document.getElementById('backupCodesGrid');
            if (!grid) return;
            grid.innerHTML = codesArray.map(c => `<div class="code-item">${c}</div>`).join('');
        }

        // ============================================
        // 6. التهيئة الأولية والتحقق من حالة الحساب
        // ============================================

        try {
            if (window.TeraAuth && typeof window.TeraAuth.check2FAStatus === 'function') {
                is2FAEnabled = await window.TeraAuth.check2FAStatus();
            } else {
                // في حال عدم توفر الخدمة، نترك الحالة الافتراضية (غير مفعلة)
                console.warn('⚠️ لا يمكن التحقق من حالة 2FA: دالة check2FAStatus غير موجودة.');
            }
        } catch (error) {
            console.error('❌ تعذر جلب حالة المصادقة:', error);
        }

        updateUI();
        console.log('✅ [Security] اكتملت تهيئة صفحة المصادقة الثنائية.');
    }
};
