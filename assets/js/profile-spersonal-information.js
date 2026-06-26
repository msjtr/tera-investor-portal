/**
 * ============================================================
 * المعلومات الشخصية - Personal Information
 * الموقع: /assets/js/profile-personal-information.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.ProfilePages = window.ProfilePages || {};

window.ProfilePages['personal-information'] = {
    init: function() {
        console.log('📝 Initializing Personal Information page...');

        const form = document.getElementById('personalInfoForm');
        if (!form) {
            console.warn('⚠️ Personal Information elements not found.');
            return;
        }

        // ============================================================
        // 1. إظهار حقل "أخرى" عند اختيار "أخرى" في الجنسية
        // ============================================================
        const nationalitySelect = document.getElementById('nationality');
        const nationalityOtherContainer = document.getElementById('nationalityOtherContainer');
        const nationalityOtherInput = document.getElementById('nationalityOther');

        if (nationalitySelect && nationalityOtherContainer) {
            nationalitySelect.addEventListener('change', function() {
                if (this.value === 'other') {
                    nationalityOtherContainer.classList.add('show');
                    nationalityOtherInput.setAttribute('required', 'required');
                } else {
                    nationalityOtherContainer.classList.remove('show');
                    nationalityOtherInput.removeAttribute('required');
                    nationalityOtherInput.value = '';
                }
            });
        }

        // ============================================================
        // 2. ديناميكية الوثائق حسب نوع الهوية
        // ============================================================
        const idType = document.getElementById('idType');
        const idNumber = document.getElementById('idNumber');
        const idFormatHint = document.getElementById('idFormatHint');
        const documentsCard = document.getElementById('documentsCard');
        const uploadArea = document.getElementById('dynamicUploadArea');

        if (idType) {
            idType.addEventListener('change', function() {
                const type = this.value;
                idNumber.value = '';
                idNumber.removeAttribute('pattern');
                idNumber.oninput = null;

                if (!type) {
                    documentsCard.style.display = 'none';
                    idFormatHint.textContent = 'يتم التحقق تلقائياً حسب نوع الوثيقة المختارة.';
                    uploadArea.innerHTML = '';
                    return;
                }

                documentsCard.style.display = 'block';
                let filesHtml = '';
                let hintText = '';

                switch (type) {
                    case 'national':
                        idNumber.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                        hintText = 'الهوية الوطنية: أرقام فقط (10 أرقام).';
                        filesHtml = this.createUploadFields(
                            'صورة الهوية الوطنية (الوجه الأمامي)',
                            'صورة الهوية الوطنية (الوجه الخلفي)'
                        );
                        break;
                    case 'residency':
                        idNumber.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                        hintText = 'الإقامة: أرقام فقط (10 أرقام).';
                        filesHtml = this.createUploadFields(
                            'صورة الإقامة (الوجه الأمامي)',
                            'صورة الإقامة (الوجه الخلفي)'
                        );
                        break;
                    case 'gcc':
                        idNumber.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                        hintText = 'الهوية الخليجية: أرقام فقط.';
                        filesHtml = this.createUploadFields(
                            'صورة الهوية الخليجية (الوجه الأمامي)',
                            'صورة الهوية الخليجية (الوجه الخلفي)'
                        );
                        break;
                    case 'arab':
                        hintText = 'الهوية العربية: حسب متطلبات دولة الإصدار.';
                        filesHtml = this.createUploadFields(
                            'صورة الهوية الوطنية لبلد الإصدار (الوجه الأمامي)',
                            'صورة الهوية الوطنية لبلد الإصدار (الوجه الخلفي)'
                        );
                        break;
                    case 'passport':
                        idNumber.oninput = function() { this.value = this.value.replace(/[^A-Za-z0-9]/g, ''); };
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

                idFormatHint.textContent = hintText;
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
            }.bind(this));
        }

        // ============================================================
        // 3. التحقق من الحقول الإلزامية عند الإرسال
        // ============================================================
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // جمع جميع الحقول المطلوبة
            const requiredFields = form.querySelectorAll('[required]');
            let missingFields = [];
            let firstInvalid = null;

            requiredFields.forEach(function(field) {
                // تخطي الحقول المخفية (مثل حقل "أخرى" المخفي)
                if (field.closest('.other-field') && !field.closest('.other-field').classList.contains('show')) {
                    return;
                }
                // تخطي حقول الراديو (يتم التحقق منها بشكل منفصل)
                if (field.type === 'radio') return;

                const value = field.value.trim();
                if (value === '' || value === '0' || value === 'اختر...' || value === 'اختر الجنسية...' || value === 'اختر نوع الهوية...' || value === 'يرجى تحديد الجنسية') {
                    let label = field.closest('.form-group')?.querySelector('.form-label');
                    let labelText = label ? label.textContent.replace(/[†*]/g, '').trim() : 'حقل';
                    if (field.tagName === 'SELECT' && field.value === '') {
                        missingFields.push(labelText);
                        if (!firstInvalid) firstInvalid = field;
                        field.style.borderColor = '#dc2626';
                    } else if (field.type !== 'select-one') {
                        missingFields.push(labelText);
                        if (!firstInvalid) firstInvalid = field;
                        field.style.borderColor = '#dc2626';
                    }
                } else {
                    field.style.borderColor = '';
                }
            });

            // التحقق من مجموعة الراديو (الجنس)
            const genderRadios = document.querySelectorAll('input[name="gender"]');
            const genderChecked = Array.from(genderRadios).some(r => r.checked);
            if (!genderChecked) {
                missingFields.push('الجنس');
                const genderGroup = document.getElementById('genderGroup');
                if (genderGroup) {
                    genderGroup.style.borderColor = '#dc2626';
                    if (!firstInvalid) firstInvalid = genderRadios[0];
                }
            } else {
                const genderGroup = document.getElementById('genderGroup');
                if (genderGroup) genderGroup.style.borderColor = '';
            }

            // التحقق من الإقرار
            const declarationCheck = document.getElementById('declarationCheck');
            if (!declarationCheck.checked) {
                missingFields.push('الإقرار والتعهد');
                if (!firstInvalid) firstInvalid = declarationCheck;
                declarationCheck.style.outline = '2px solid #dc2626';
            } else {
                declarationCheck.style.outline = '';
            }

            // إذا كانت هناك حقول ناقصة
            if (missingFields.length > 0) {
                let msg = '⚠️ يرجى استكمال الحقول التالية قبل المتابعة:\n\n';
                missingFields.forEach(function(field) {
                    msg += '• ' + field + '\n';
                });
                alert(msg);
                if (firstInvalid) {
                    firstInvalid.focus();
                    if (firstInvalid.type === 'radio') {
                        const parent = firstInvalid.closest('.radio-group');
                        if (parent) parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                return;
            }

            // جميع الحقول مكتملة
            alert('✅ تم حفظ البيانات بنجاح.\nجاري تحويلك إلى صفحة إدخال رمز التحقق (OTP)...');
        });

        // ============================================================
        // 4. إزالة التحديد الأحمر عند تعديل الحقل
        // ============================================================
        document.querySelectorAll('.form-control').forEach(function(field) {
            field.addEventListener('input', function() {
                this.style.borderColor = '';
            });
            field.addEventListener('change', function() {
                this.style.borderColor = '';
            });
        });

        document.querySelectorAll('input[name="gender"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                const genderGroup = document.getElementById('genderGroup');
                if (genderGroup) genderGroup.style.borderColor = '';
            });
        });

        const declarationCheck = document.getElementById('declarationCheck');
        if (declarationCheck) {
            declarationCheck.addEventListener('change', function() {
                this.style.outline = '';
            });
        }

        // ============================================================
        // 5. دوال مساعدة (لإنشاء حقول الرفع)
        // ============================================================
        this.createUploadFields = function(labelFront, labelBack) {
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
        };

        console.log('✅ Personal Information page initialized successfully.');
    }
};
