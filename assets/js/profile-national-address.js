/**
 * ============================================================
 * العنوان الوطني - National Address
 * ============================================================
 * الموقع: /assets/js/profile-national-address.js
 * ============================================================
 */

const ProfilePages = ProfilePages || {};

ProfilePages['national-address'] = {
    init: function() {
        console.log('📍 Initializing National Address page...');

        const form = document.getElementById('nationalAddressForm');
        if (!form) {
            console.warn('⚠️ National Address elements not found.');
            return;
        }

        // إظهار/إخفاء أقسام العنوان حسب نوع الإقامة
        const residencyRadios = document.querySelectorAll('input[name="residencyType"]');
        const nationalSection = document.getElementById('nationalAddressSection');
        const outsideSection = document.getElementById('outsideAddressSection');

        function toggleAddressSections() {
            const selected = document.querySelector('input[name="residencyType"]:checked');
            if (!selected) return;

            if (selected.value === 'citizen' || selected.value === 'resident_inside') {
                nationalSection.style.display = 'block';
                outsideSection.style.display = 'none';
            } else if (selected.value === 'resident_outside') {
                nationalSection.style.display = 'none';
                outsideSection.style.display = 'block';
            }
        }

        residencyRadios.forEach(function(radio) {
            radio.addEventListener('change', toggleAddressSections);
        });

        // استيراد العنوان الوطني
        const importBtn = document.getElementById('importAddressBtn');
        if (importBtn) {
            importBtn.addEventListener('click', function() {
                alert('🔗 جاري استيراد العنوان الوطني...\n(خدمة الربط الإلكتروني قيد التطوير)');
            });
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

            const proofUpload = document.querySelector('#proofAddressUpload input[type="file"]');
            if (!proofUpload || !proofUpload.files || proofUpload.files.length === 0) {
                alert('يرجى رفع مستند إثبات العنوان.');
                document.querySelector('#proofAddressUpload').focus();
                return;
            }

            alert('✅ تم حفظ العنوان بنجاح.\nجاري مراجعة المستندات...');
        });

        // تهيئة أولية
        toggleAddressSections();

        console.log('✅ National Address page initialized.');
    }
};
