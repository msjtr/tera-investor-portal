/**
 * ============================================
 * ملف الأوامر الخاص بصفحة "المعلومات الشخصية"
 * (profile-spersonal-information.js)
 * يعالج ديناميكية الوثائق والتحقق من صحة الإدخال
 * ============================================
 */

/**
 * معالج تغيير نوع الهوية
 * يقوم بتحديث حقل رقم الهوية، عرض التلميحات، وإظهار مرفقات الوثائق المطلوبة.
 */
function handleIdTypeChange() {
    const typeSelect = document.getElementById('idType');
    const type = typeSelect.value;
    const idInput = document.getElementById('idNumber');
    const hint = document.getElementById('idFormatHint');
    const docsCard = document.getElementById('documentsCard');
    const uploadArea = document.getElementById('dynamicUploadArea');

    // إعادة تعيين الحقل
    idInput.value = '';
    idInput.removeAttribute('pattern');
    idInput.oninput = null;

    if (!type) {
        docsCard.style.display = 'none';
        hint.textContent = 'يتم التحقق تلقائياً حسب نوع الوثيقة المختارة.';
        uploadArea.innerHTML = '';
        return;
    }

    docsCard.style.display = 'block';

    let filesHtml = '';
    let hintText = '';

    switch (type) {
        case 'national':
            idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
            hintText = 'الهوية الوطنية: أرقام فقط (10 أرقام).';
            filesHtml = createUploadFields(
                'صورة الهوية الوطنية (الوجه الأمامي)',
                'صورة الهوية الوطنية (الوجه الخلفي)'
            );
            break;

        case 'residency':
            idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
            hintText = 'الإقامة: أرقام فقط (10 أرقام).';
            filesHtml = createUploadFields(
                'صورة الإقامة (الوجه الأمامي)',
                'صورة الإقامة (الوجه الخلفي)'
            );
            break;

        case 'gcc':
            idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
            hintText = 'الهوية الخليجية: أرقام فقط.';
            filesHtml = createUploadFields(
                'صورة الهوية الخليجية (الوجه الأمامي)',
                'صورة الهوية الخليجية (الوجه الخلفي)'
            );
            break;

        case 'arab':
            hintText = 'الهوية العربية: حسب متطلبات دولة الإصدار.';
            filesHtml = createUploadFields(
                'صورة الهوية الوطنية لبلد الإصدار (الوجه الأمامي)',
                'صورة الهوية الوطنية لبلد الإصدار (الوجه الخلفي)'
            );
            break;

        case 'passport':
            idInput.oninput = function() { this.value = this.value.replace(/[^A-Za-z0-9]/g, ''); };
            hintText = 'جواز السفر: أحرف وأرقام إنجليزية.';
            filesHtml = `
                <div class="form-group full-width">
                    <label class="form-label">صورة الصفحة الأولى من الجواز (صفحة البيانات الشخصية) <span class="req">*</span></label>
                    <label class="upload-zone">
                        <i class="fas fa-passport"></i>
                        <span>اضغط لرفع الصورة</span>
                        <span class="sub-text">JPG, PNG, PDF حتى 5 ميجابايت</span>
                        <input type="file" style="display:none;" accept="image/*,.pdf" required>
                    </label>
                </div>
                <div class="form-group full-width">
                    <label class="form-label">صورة التأشيرة أو صفحة الإقامة (إن وجدت)</label>
                    <label class="upload-zone">
                        <i class="fas fa-stamp"></i>
                        <span>اضغط لرفع الصورة (اختياري)</span>
                        <span class="sub-text">JPG, PNG, PDF حتى 5 ميجابايت</span>
                        <input type="file" style="display:none;" accept="image/*,.pdf">
                    </label>
                </div>
            `;
            break;

        default:
            hintText = 'يرجى اختيار نوع الهوية.';
            filesHtml = '';
    }

    hint.textContent = hintText;
    uploadArea.innerHTML = filesHtml;

    // إعادة ربط أحداث الرفع لكل منطقة تحميل
    document.querySelectorAll('.upload-zone').forEach(function(zone) {
        const fileInput = zone.querySelector('input[type="file"]');
        if (fileInput) {
            zone.addEventListener('click', function(e) {
                e.stopPropagation();
                fileInput.click();
            });
            fileInput.addEventListener('change', function(e) {
                e.stopPropagation();
                if (this.files && this.files.length > 0) {
                    const fileName = this.files[0].name;
                    const span = zone.querySelector('span:first-of-type');
                    if (span) {
                        span.textContent = fileName.length > 25 ? fileName.slice(0, 22) + '…' : fileName;
                        span.style.color = '#028090';
                    }
                }
            });
        }
    });
}

/**
 * إنشاء حقول رفع الملفات (وجه أمامي + وجه خلفي)
 */
function createUploadFields(labelFront, labelBack) {
    return `
        <div class="form-group">
            <label class="form-label">${labelFront} <span class="req">*</span></label>
            <label class="upload-zone">
                <i class="fas fa-id-card"></i>
                <span>اضغط لرفع الصورة</span>
                <span class="sub-text">JPG, PNG, PDF حتى 5 ميجابايت</span>
                <input type="file" style="display:none;" accept="image/*,.pdf" required>
            </label>
        </div>
        <div class="form-group">
            <label class="form-label">${labelBack} <span class="req">*</span></label>
            <label class="upload-zone">
                <i class="fas fa-id-card"></i>
                <span>اضغط لرفع الصورة</span>
                <span class="sub-text">JPG, PNG, PDF حتى 5 ميجابايت</span>
                <input type="file" style="display:none;" accept="image/*,.pdf" required>
            </label>
        </div>
    `;
}

// =========================================
// تهيئة الصفحة عند تحميل DOM
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    // إخفاء بطاقة الوثائق مبدئياً
    const docsCard = document.getElementById('documentsCard');
    if (docsCard) {
        docsCard.style.display = 'none';
    }

    // معالج إرسال النموذج
    const form = document.getElementById('personalInfoForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const declarationCheck = document.getElementById('declarationCheck');
            if (!declarationCheck.checked) {
                alert('يرجى الموافقة على الإقرار والتعهد قبل المتابعة.');
                declarationCheck.focus();
                return;
            }

            alert('✅ تم حفظ البيانات بنجاح.\nجاري تحويلك إلى صفحة إدخال رمز التحقق (OTP)...');
        });
    }

    // ربط دالة handleIdTypeChange بالنطاق العالمي (للاستخدام في onchange)
    window.handleIdTypeChange = handleIdTypeChange;
});
