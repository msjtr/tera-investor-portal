/**
 * ============================================================
 * المعلومات الشخصية - Personal Information
 * ============================================================
 * الموقع: /assets/js/profile-personal-information.js
 * ============================================================
 */

// التأكد من وجود الكائن العام قبل إضافة الخصائص إليه
window.ProfilePages = window.ProfilePages || {};

window.ProfilePages['personal-information'] = {
    init: function() {
        console.log('📝 Initializing Personal Information page...');

        const idType = document.getElementById('idType');
        if (!idType) {
            console.warn('⚠️ Personal Information elements not found.');
            return;
        }

        // تعريف دالة handleIdTypeChange في النطاق العالمي للاستخدام في onchange
        const self = this;
        window.handleIdTypeChange = function() {
            const typeSelect = document.getElementById('idType');
            const type = typeSelect.value;
            const idInput = document.getElementById('idNumber');
            const hint = document.getElementById('idFormatHint');
            const docsCard = document.getElementById('documentsCard');
            const uploadArea = document.getElementById('dynamicUploadArea');

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
                    filesHtml = self.createUploadFields('صورة الهوية الوطنية (الوجه الأمامي)', 'صورة الهوية الوطنية (الوجه الخلفي)');
                    break;
                case 'residency':
                    idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                    hintText = 'الإقامة: أرقام فقط (10 أرقام).';
                    filesHtml = self.createUploadFields('صورة الإقامة (الوجه الأمامي)', 'صورة الإقامة (الوجه الخلفي)');
                    break;
                case 'gcc':
                    idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                    hintText = 'الهوية الخليجية: أرقام فقط.';
                    filesHtml = self.createUploadFields('صورة الهوية الخليجية (الوجه الأمامي)', 'صورة الهوية الخليجية (الوجه الخلفي)');
                    break;
                case 'arab':
                    hintText = 'الهوية العربية: حسب متطلبات دولة الإصدار.';
                    filesHtml = self.createUploadFields('صورة الهوية الوطنية لبلد الإصدار (الوجه الأمامي)', 'صورة الهوية الوطنية لبلد الإصدار (الوجه الخلفي)');
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

            // ربط أحداث الرفع
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
        };

        // تهيئة الصفحة
        const docsCard = document.getElementById('documentsCard');
        if (docsCard) docsCard.style.display = 'none';

        const form = document.getElementById('personalInfoForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const declaration = document.getElementById('declarationCheck');
                if (!declaration.checked) {
                    alert('يرجى الموافقة على الإقرار والتعهد قبل المتابعة.');
                    declaration.focus();
                    return;
                }
                alert('✅ تم حفظ البيانات بنجاح.\nجاري تحويلك إلى صفحة إدخال رمز التحقق (OTP)...');
            });
        }

        console.log('✅ Personal Information page initialized.');
    },

    createUploadFields: function(labelFront, labelBack) {
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
};
