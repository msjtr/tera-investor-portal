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

    // إزالة أي رسائل خطأ سابقة
    clearFieldError(idInput);

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
            idInput.oninput = function() { 
                this.value = this.value.replace(/[^0-9]/g, ''); 
                clearFieldError(this);
            };
            hintText = 'الهوية الوطنية: أرقام فقط (10 أرقام).';
            filesHtml = createUploadFields(
                'صورة الهوية الوطنية (الوجه الأمامي)',
                'صورة الهوية الوطنية (الوجه الخلفي)'
            );
            break;

        case 'residency':
            idInput.oninput = function() { 
                this.value = this.value.replace(/[^0-9]/g, ''); 
                clearFieldError(this);
            };
            hintText = 'الإقامة: أرقام فقط (10 أرقام).';
            filesHtml = createUploadFields(
                'صورة الإقامة (الوجه الأمامي)',
                'صورة الإقامة (الوجه الخلفي)'
            );
            break;

        case 'gcc':
            idInput.oninput = function() { 
                this.value = this.value.replace(/[^0-9]/g, ''); 
                clearFieldError(this);
            };
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
            idInput.oninput = function() { 
                this.value = this.value.replace(/[^A-Za-z0-9]/g, ''); 
                clearFieldError(this);
            };
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
                    // إزالة أي خطأ سابق للرفع
                    const parentGroup = zone.closest('.form-group');
                    if (parentGroup) {
                        const existingError = parentGroup.querySelector('.field-error');
                        if (existingError) existingError.remove();
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

/**
 * عرض رسالة خطأ بجانب الحقل
 */
function showFieldError(element, message) {
    clearFieldError(element);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#dc2626';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.fontWeight = '600';
    errorDiv.style.marginTop = '4px';
    errorDiv.textContent = message;
    element.parentNode.appendChild(errorDiv);
    element.style.borderColor = '#dc2626';
}

/**
 * إزالة رسالة الخطأ عن الحقل
 */
function clearFieldError(element) {
    const parent = element.parentNode;
    const existingError = parent.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    element.style.borderColor = '';
}

/**
 * التحقق من صحة النموذج بالكامل
 */
function validateForm() {
    let isValid = true;
    let firstInvalidField = null;

    // 1. التحقق من الحقول المطلوبة الأساسية
    const requiredFields = document.querySelectorAll('#personalInfoForm [required]');
    requiredFields.forEach(function(field) {
        // تخطي الحقول المخفية أو المعطلة
        if (field.closest('.panel-card') && field.closest('.panel-card').style.display === 'none') {
            return;
        }
        if (field.type === 'file') {
            // التحقق من رفع الملفات إذا كانت مطلوبة وظاهرة
            if (field.closest('.panel-card') && field.closest('.panel-card').style.display !== 'none') {
                if (!field.files || field.files.length === 0) {
                    showFieldError(field, 'هذا الحقل مطلوب');
                    isValid = false;
                    if (!firstInvalidField) firstInvalidField = field;
                }
            }
            return;
        }
        if (field.type === 'radio') {
            // التحقق من الراديو يتم بشكل منفصل
            return;
        }
        if (field.type === 'checkbox') {
            // التحقق من checkbox يتم بشكل منفصل
            return;
        }
        if (!field.value || field.value.trim() === '') {
            showFieldError(field, 'هذا الحقل مطلوب');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = field;
        } else {
            clearFieldError(field);
        }
    });

    // 2. التحقق من مجموعة الراديو (الجنس)
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    if (genderRadios.length > 0) {
        const checked = Array.from(genderRadios).some(r => r.checked);
        if (!checked) {
            const parent = genderRadios[0].closest('.radio-group');
            if (parent) {
                // عرض رسالة خطأ تحت المجموعة
                const existingError = parent.parentNode.querySelector('.field-error');
                if (!existingError) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'field-error';
                    errorDiv.style.color = '#dc2626';
                    errorDiv.style.fontSize = '12px';
                    errorDiv.style.fontWeight = '600';
                    errorDiv.style.marginTop = '4px';
                    errorDiv.textContent = 'يرجى اختيار الجنس';
                    parent.parentNode.appendChild(errorDiv);
                }
                isValid = false;
                if (!firstInvalidField) firstInvalidField = genderRadios[0];
            }
        } else {
            // إزالة أي خطأ سابق
            const parent = genderRadios[0].closest('.radio-group');
            if (parent) {
                const existingError = parent.parentNode.querySelector('.field-error');
                if (existingError) existingError.remove();
            }
        }
    }

    // 3. التحقق من الإقرار
    const declarationCheck = document.getElementById('declarationCheck');
    if (declarationCheck && !declarationCheck.checked) {
        showFieldError(declarationCheck, 'يجب الموافقة على الإقرار والتعهد');
        isValid = false;
        if (!firstInvalidField) firstInvalidField = declarationCheck;
    } else if (declarationCheck) {
        clearFieldError(declarationCheck);
    }

    // 4. تحقق خاص: تاريخ الميلاد (يجب أن يكون في الماضي)
    const birthDateInput = document.querySelector('input[type="date"][placeholder*="الميلاد"]') || 
                          document.querySelector('input[type="date"]:nth-of-type(1)');
    if (birthDateInput && birthDateInput.value) {
        const birthDate = new Date(birthDateInput.value);
        const today = new Date();
        if (birthDate >= today) {
            showFieldError(birthDateInput, 'تاريخ الميلاد يجب أن يكون في الماضي');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = birthDateInput;
        } else {
            clearFieldError(birthDateInput);
        }
    }

    // 5. تحقق خاص: تاريخ الإصدار وتاريخ الانتهاء
    const dateInputs = document.querySelectorAll('input[type="date"]');
    let issueDateInput = null;
    let expiryDateInput = null;
    if (dateInputs.length >= 3) {
        // الترتيب: الميلاد، الإصدار، الانتهاء (حسب ترتيب HTML)
        issueDateInput = dateInputs[1];
        expiryDateInput = dateInputs[2];
    }
    if (issueDateInput && issueDateInput.value && expiryDateInput && expiryDateInput.value) {
        const issueDate = new Date(issueDateInput.value);
        const expiryDate = new Date(expiryDateInput.value);
        if (expiryDate <= issueDate) {
            showFieldError(expiryDateInput, 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = expiryDateInput;
        } else {
            clearFieldError(expiryDateInput);
        }
        // التأكد من أن تاريخ الإصدار ليس في المستقبل
        const today = new Date();
        if (issueDate > today) {
            showFieldError(issueDateInput, 'تاريخ الإصدار لا يمكن أن يكون في المستقبل');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = issueDateInput;
        } else {
            clearFieldError(issueDateInput);
        }
    }

    // 6. تحقق خاص: رقم الهوية حسب النوع
    const idType = document.getElementById('idType');
    const idNumber = document.getElementById('idNumber');
    if (idType && idNumber && idNumber.value) {
        const type = idType.value;
        let pattern = null;
        let errorMsg = '';
        switch (type) {
            case 'national':
            case 'residency':
            case 'gcc':
                if (!/^\d{10}$/.test(idNumber.value)) {
                    errorMsg = 'رقم الهوية يجب أن يتكون من 10 أرقام';
                }
                break;
            case 'arab':
                if (!/^\d+$/.test(idNumber.value)) {
                    errorMsg = 'رقم الهوية العربية يجب أن يحتوي على أرقام فقط';
                }
                break;
            case 'passport':
                if (!/^[A-Za-z0-9]{6,9}$/.test(idNumber.value)) {
                    errorMsg = 'رقم الجواز يجب أن يتكون من 6 إلى 9 أحرف أو أرقام';
                }
                break;
            default:
                break;
        }
        if (errorMsg) {
            showFieldError(idNumber, errorMsg);
            isValid = false;
            if (!firstInvalidField) firstInvalidField = idNumber;
        } else {
            clearFieldError(idNumber);
        }
    }

    // 7. التركيز على أول حقل غير صحيح
    if (firstInvalidField) {
        firstInvalidField.focus();
        // إذا كان الحقل من نوع radio أو checkbox، نحرك التركيز إلى العنصر الأب
        if (firstInvalidField.type === 'radio' || firstInvalidField.type === 'checkbox') {
            const parent = firstInvalidField.closest('.radio-group') || firstInvalidField.closest('.declaration-box');
            if (parent) {
                parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    return isValid;
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

    // معالج إرسال النموذج مع تحقق شامل
    const form = document.getElementById('personalInfoForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // تشغيل التحقق الشامل
            if (!validateForm()) {
                // إظهار رسالة عامة
                const errorSummary = document.querySelector('.error-summary');
                if (!errorSummary) {
                    const summary = document.createElement('div');
                    summary.className = 'error-summary';
                    summary.style.backgroundColor = '#fee2e2';
                    summary.style.border = '1px solid #fca5a5';
                    summary.style.color = '#b91c1c';
                    summary.style.padding = '12px 18px';
                    summary.style.borderRadius = '10px';
                    summary.style.marginBottom = '20px';
                    summary.style.fontWeight = '700';
                    summary.style.display = 'flex';
                    summary.style.alignItems = 'center';
                    summary.style.gap = '10px';
                    summary.innerHTML = '<i class="fas fa-exclamation-circle"></i> يرجى تصحيح الأخطاء الموضحة أعلاه قبل المتابعة.';
                    form.prepend(summary);
                }
                return;
            }

            // إزالة أي ملخص أخطاء سابق
            const existingSummary = form.querySelector('.error-summary');
            if (existingSummary) existingSummary.remove();

            // التحقق الإضافي من الإقرار (تم التحقق منه في validateForm)
            const declarationCheck = document.getElementById('declarationCheck');
            if (!declarationCheck.checked) {
                // تم التحقق بالفعل
                return;
            }

            // محاكاة حفظ البيانات
            alert('✅ تم حفظ البيانات بنجاح.\nجاري تحويلك إلى صفحة إدخال رمز التحقق (OTP)...');
        });

        // إزالة رسائل الخطأ عند تغيير الحقل
        form.querySelectorAll('input, select, textarea').forEach(function(field) {
            field.addEventListener('input', function() {
                clearFieldError(this);
                // إزالة ملخص الأخطاء إذا تم تعديل الحقل
                const summary = form.querySelector('.error-summary');
                if (summary) summary.remove();
            });
            field.addEventListener('change', function() {
                clearFieldError(this);
                const summary = form.querySelector('.error-summary');
                if (summary) summary.remove();
            });
        });
    }

    // ربط دالة handleIdTypeChange بالنطاق العالمي (للاستخدام في onchange)
    window.handleIdTypeChange = handleIdTypeChange;
});
