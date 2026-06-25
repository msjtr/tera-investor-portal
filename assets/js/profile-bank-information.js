/**
 * ============================================================
 * المعلومات البنكية - Bank Information
 * ============================================================
 * الموقع: /assets/js/profile-bank-information.js
 * ============================================================
 */

const ProfilePages = ProfilePages || {};

ProfilePages['bank-information'] = {
    init: function() {
        console.log('🏦 Initializing Bank Information page...');

        const form = document.getElementById('bankInfoForm');
        if (!form) {
            console.warn('⚠️ Bank Information elements not found.');
            return;
        }

        // إظهار/إخفاء الحقول الدولية
        const countrySelect = document.getElementById('bankCountry');
        const internationalSection = document.getElementById('internationalFields');

        function toggleInternationalFields() {
            if (countrySelect && internationalSection) {
                const selectedCountry = countrySelect.value;
                if (selectedCountry && selectedCountry !== 'sa') {
                    internationalSection.classList.add('show');
                } else {
                    internationalSection.classList.remove('show');
                }
            }
        }

        if (countrySelect) {
            countrySelect.addEventListener('change', toggleInternationalFields);
            setTimeout(toggleInternationalFields, 100);
        }

        // التحقق من تطابق الآيبان
        const ibanInput = document.getElementById('iban');
        const confirmIbanInput = document.getElementById('confirmIban');
        const ibanHint = document.getElementById('ibanMatchHint');

        if (ibanInput && confirmIbanInput && ibanHint) {
            function checkIbanMatch() {
                if (confirmIbanInput.value.length > 0) {
                    if (ibanInput.value === confirmIbanInput.value) {
                        ibanHint.textContent = '✅ رقم الآيبان متطابق.';
                        ibanHint.style.color = '#10b981';
                        confirmIbanInput.style.borderColor = '#10b981';
                    } else {
                        ibanHint.textContent = '❌ رقم الآيبان غير متطابق.';
                        ibanHint.style.color = '#dc2626';
                        confirmIbanInput.style.borderColor = '#dc2626';
                    }
                } else {
                    ibanHint.textContent = 'يجب أن يتطابق مع رقم الآيبان المدخل.';
                    ibanHint.style.color = '#64748b';
                    confirmIbanInput.style.borderColor = '#d1d9e6';
                }
            }

            ibanInput.addEventListener('input', checkIbanMatch);
            confirmIbanInput.addEventListener('input', checkIbanMatch);
        }

        // تفعيل رفع الملفات
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

        // معالج إرسال النموذج
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const declaration = document.getElementById('declarationCheck');
            if (!declaration.checked) {
                alert('يرجى الموافقة على الإقرار والتعهد قبل المتابعة.');
                declaration.focus();
                return;
            }

            if (ibanInput && confirmIbanInput && ibanInput.value !== confirmIbanInput.value) {
                alert('رقم الآيبان وتأكيده غير متطابقين. يرجى المراجعة.');
                confirmIbanInput.focus();
                return;
            }

            const fileInput = document.querySelector('#bankProofUpload input[type="file"]');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                alert('يرجى رفع مستند إثبات الحساب البنكي.');
                document.querySelector('#bankProofUpload').focus();
                return;
            }

            if (countrySelect && countrySelect.value && countrySelect.value !== 'sa') {
                const swift = document.getElementById('swiftCode');
                const bankNameEn = document.getElementById('bankNameEn');
                const bankAddress = document.getElementById('bankAddress');
                const bankCity = document.getElementById('bankCity');
                if (!swift.value || !bankNameEn.value || !bankAddress.value || !bankCity.value) {
                    alert('يرجى إكمال جميع الحقول الإضافية للحسابات خارج المملكة.');
                    return;
                }
            }

            alert('✅ تم حفظ البيانات البنكية بنجاح.\nجاري التحقق من المستندات...');
        });

        console.log('✅ Bank Information page initialized.');
    }
};
