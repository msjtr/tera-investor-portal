/**
 * ============================================================
 * معلومات الاتصال - Contact Information
 * ============================================================
 * الموقع: /assets/js/profile-contact-information.js
 * ============================================================
 */

const ProfilePages = ProfilePages || {};

ProfilePages['contact-information'] = {
    init: function() {
        console.log('📞 Initializing Contact Information page...');

        const form = document.getElementById('contactForm');
        if (!form) {
            console.warn('⚠️ Contact Information elements not found.');
            return;
        }

        // إرسال رمز التحقق
        const sendOtpBtn = document.getElementById('sendOtpBtn');
        if (sendOtpBtn) {
            sendOtpBtn.addEventListener('click', function() {
                const email = document.getElementById('primaryEmail').value;
                if (!email || !email.includes('@')) {
                    alert('يرجى إدخال بريد إلكتروني صحيح أولاً.');
                    document.getElementById('primaryEmail').focus();
                    return;
                }
                alert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني: ' + email);
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                this.disabled = true;
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الرمز';
                    this.disabled = false;
                }, 2000);
            });
        }

        // معالج إرسال النموذج
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const declaration = document.getElementById('declarationCheck');
            if (!declaration.checked) {
                alert('يرجى الموافقة على الإقرار والتعهد قبل المتابعة.');
                declaration.focus();
                return;
            }

            const mobile = document.getElementById('mobileNumber').value;
            if (mobile.length < 9 || mobile.length > 12) {
                alert('يرجى إدخال رقم جوال صحيح (9-12 رقم).');
                document.getElementById('mobileNumber').focus();
                return;
            }

            const email = document.getElementById('primaryEmail').value;
            if (!email || !email.includes('@') || !email.includes('.')) {
                alert('يرجى إدخال بريد إلكتروني صحيح.');
                document.getElementById('primaryEmail').focus();
                return;
            }

            const otp = document.getElementById('otpCode').value;
            if (otp.length !== 6) {
                alert('يرجى إدخال رمز التحقق المكون من 6 أرقام.');
                document.getElementById('otpCode').focus();
                return;
            }

            const emergencyName = document.getElementById('emergencyName').value;
            if (!emergencyName || emergencyName.length < 3) {
                alert('يرجى إدخال الاسم الكامل لجهة اتصال الطوارئ.');
                document.getElementById('emergencyName').focus();
                return;
            }

            const emergencyMobile = document.getElementById('emergencyMobile').value;
            if (emergencyMobile.length < 9 || emergencyMobile.length > 12) {
                alert('يرجى إدخال رقم جوال صحيح لجهة اتصال الطوارئ.');
                document.getElementById('emergencyMobile').focus();
                return;
            }

            alert('✅ تم حفظ بيانات الاتصال بنجاح.\nجاري التحقق من الرمز...');
        });

        console.log('✅ Contact Information page initialized.');
    }
};
