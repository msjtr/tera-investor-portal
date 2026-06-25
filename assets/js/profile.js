/**
 * ============================================================
 * profile.js - الملف الرئيسي لإدارة صفحات الملف الشخصي
 * يشغل 5 صفحات:个人信息، الاتصال، العنوان، البنكي، المرفقات
 * ============================================================
 * الموقع: /assets/js/profile.js
 * تاريخ التحديث: 2026-06-25
 * ============================================================
 * الصفحات المدعومة:
 *   1. personal-information.html   - المعلومات الشخصية
 *   2. contact-information.html    - معلومات الاتصال
 *   3. national-address.html       - العنوان الوطني
 *   4. bank-information.html       - المعلومات البنكية
 *   5. attachments.html            - المرفقات والوثائق
 * ============================================================
 */

const Profile = {
    /**
     * تهيئة الملف الشخصي بالكامل
     */
    init: function() {
        console.log('🚀 Initializing Profile Pages...');

        // تهيئة المكونات المشتركة بين جميع الصفحات
        this.initSidebar();
        this.initSubmenus();
        this.initLogout();
        this.initActiveNav();

        // التحقق من الصفحة الحالية وتشغيل التهيئة المناسبة
        const currentPage = this.getCurrentPage();
        console.log(`📄 Current page: ${currentPage}`);

        switch (currentPage) {
            case 'personal-information':
                this.initPersonalInformation();
                break;
            case 'contact-information':
                this.initContactInformation();
                break;
            case 'national-address':
                this.initNationalAddress();
                break;
            case 'bank-information':
                this.initBankInformation();
                break;
            case 'attachments':
                this.initAttachments();
                break;
            default:
                console.warn('⚠️ No specific initialization for this page.');
        }

        console.log('✅ Profile pages initialized successfully.');
    },

    /**
     * تحديد الصفحة الحالية بناءً على مسار URL
     */
    getCurrentPage: function() {
        const path = window.location.pathname;
        if (path.includes('personal-information')) return 'personal-information';
        if (path.includes('contact-information')) return 'contact-information';
        if (path.includes('national-address')) return 'national-address';
        if (path.includes('bank-information')) return 'bank-information';
        if (path.includes('attachments')) return 'attachments';
        return 'unknown';
    },

    // ============================================================
    // 1. تهيئة القائمة الجانبية
    // ============================================================
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) {
            console.error('❌ Error: Element with ID "sidebar" NOT FOUND.');
            return;
        }

        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                } else {
                    const isOpen = sidebar.classList.contains('sidebar-open');
                    if (isOpen) {
                        sidebar.classList.remove('sidebar-open');
                        if (overlay) overlay.classList.remove('active');
                    } else {
                        sidebar.classList.add('sidebar-open');
                        if (overlay) overlay.classList.add('active');
                    }
                }
            });
        }

        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        const logo = document.querySelector('.header-logo a');
        if (logo) {
            logo.addEventListener('dblclick', function(e) {
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        // إغلاق القائمة عند تغيير حجم النافذة
        window.addEventListener('resize', function() {
            if (!isMobile() && sidebar) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    },

    // ============================================================
    // 2. إدارة القوائم الفرعية
    // ============================================================
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) return;

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');

            // السماح بالانتقال للروابط الحقيقية
            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!parentLi) return;

            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed') && window.innerWidth > 991) {
                sidebar.classList.remove('collapsed');
            }

            // إغلاق القوائم الفرعية الأخرى (Accordion)
            document.querySelectorAll('.has-submenu').forEach(function(el) {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });

            parentLi.classList.toggle('submenu-open');
        };

        submenuToggles.forEach(function(link) {
            link.removeEventListener('click', handleSubmenuClick);
            link.addEventListener('click', handleSubmenuClick);
        });
    },

    // ============================================================
    // 3. تفعيل الحالة النشطة للقائمة
    // ============================================================
    initActiveNav: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-item > a[href]');

        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href === currentPath || (href !== '#' && href !== 'javascript:void(0)' && currentPath.includes(href))) {
                const parent = link.closest('.nav-item');
                if (parent) {
                    parent.classList.add('active');
                    if (parent.classList.contains('has-submenu')) {
                        parent.classList.add('submenu-open');
                    }
                }
            }
        });
    },

    // ============================================================
    // 4. تسجيل الخروج
    // ============================================================
    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                window.location.replace('https://tera-investor-portal.onrender.com');
            }
        });
    },

    // ============================================================
    // 5. تهيئة صفحة المعلومات الشخصية
    // ============================================================
    initPersonalInformation: function() {
        // التحقق من وجود العناصر الخاصة بالصفحة
        const idType = document.getElementById('idType');
        if (!idType) {
            console.warn('⚠️ Personal Information page elements not found.');
            return;
        }

        // دالة معالج تغيير نوع الهوية
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
                    filesHtml = Profile.createUploadFields('صورة الهوية الوطنية (الوجه الأمامي)', 'صورة الهوية الوطنية (الوجه الخلفي)');
                    break;
                case 'residency':
                    idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                    hintText = 'الإقامة: أرقام فقط (10 أرقام).';
                    filesHtml = Profile.createUploadFields('صورة الإقامة (الوجه الأمامي)', 'صورة الإقامة (الوجه الخلفي)');
                    break;
                case 'gcc':
                    idInput.oninput = function() { this.value = this.value.replace(/[^0-9]/g, ''); };
                    hintText = 'الهوية الخليجية: أرقام فقط.';
                    filesHtml = Profile.createUploadFields('صورة الهوية الخليجية (الوجه الأمامي)', 'صورة الهوية الخليجية (الوجه الخلفي)');
                    break;
                case 'arab':
                    hintText = 'الهوية العربية: حسب متطلبات دولة الإصدار.';
                    filesHtml = Profile.createUploadFields('صورة الهوية الوطنية لبلد الإصدار (الوجه الأمامي)', 'صورة الهوية الوطنية لبلد الإصدار (الوجه الخلفي)');
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
        document.addEventListener('DOMContentLoaded', function() {
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

            window.handleIdTypeChange = Profile.handleIdTypeChange || function() {};
        });

        console.log('✅ Personal Information page initialized.');
    },

    // ============================================================
    // 6. تهيئة صفحة معلومات الاتصال
    // ============================================================
    initContactInformation: function() {
        const form = document.getElementById('contactForm');
        if (!form) {
            console.warn('⚠️ Contact Information page elements not found.');
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
    },

    // ============================================================
    // 7. تهيئة صفحة العنوان الوطني
    // ============================================================
    initNationalAddress: function() {
        const form = document.getElementById('nationalAddressForm');
        if (!form) {
            console.warn('⚠️ National Address page elements not found.');
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

        // رفع الملفات
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

            // التحقق من رفع المستند
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
    },

    // ============================================================
    // 8. تهيئة صفحة المعلومات البنكية
    // ============================================================
    initBankInformation: function() {
        const form = document.getElementById('bankInfoForm');
        if (!form) {
            console.warn('⚠️ Bank Information page elements not found.');
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
            // تهيئة أولية
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

        // رفع الملفات
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

            // التحقق من الحقول الإضافية للدول غير السعودية
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
    },

    // ============================================================
    // 9. تهيئة صفحة المرفقات والوثائق
    // ============================================================
    initAttachments: function() {
        // يتم تحميل المرفقات من ملف منفصل
        // إذا كان الملف منفصلاً، نتركه يعمل بمفرده
        // وإلا نقدم تهيئة بديلة

        // التحقق من وجود العناصر الأساسية
        const tableBody = document.getElementById('documentsTableBody');
        if (!tableBody) {
            console.warn('⚠️ Attachments page elements not found.');
            return;
        }

        // إذا لم يتم تحميل ملف attachments.js، نقدم تهيئة أساسية
        if (typeof documents === 'undefined') {
            // بيانات تجريبية
            const sampleDocs = [
                { id: 1, name: 'الهوية الوطنية', type: 'هوية وطنية', section: 'المعلومات الشخصية', date: '2026-06-20',
                    status: 'approved', source: 'auto' },
                { id: 2, name: 'شهادة آيبان', type: 'شهادة آيبان', section: 'المعلومات البنكية', date: '2026-06-22',
                    status: 'pending', source: 'auto' },
                { id: 3, name: 'كشف حساب بنكي', type: 'كشف حساب بنكي', section: 'المعلومات البنكية', date: '2026-06-24',
                    status: 'rejected', source: 'manual' }
            ];

            function renderSampleTable() {
                let html = '';
                sampleDocs.forEach((doc, index) => {
                    const statusMap = {
                        'approved': '<span class="status-badge status-approved"><i class="fas fa-circle"></i> معتمد</span>',
                        'pending': '<span class="status-badge status-pending"><i class="fas fa-circle"></i> قيد المراجعة</span>',
                        'rejected': '<span class="status-badge status-rejected"><i class="fas fa-circle"></i> مرفوض</span>'
                    };
                    const sourceMap = {
                        'auto': '<span class="source-tag auto"><i class="fas fa-sync-alt"></i> تلقائي</span>',
                        'manual': '<span class="source-tag manual"><i class="fas fa-user-edit"></i> يدوي</span>'
                    };
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="text-title">${doc.name}</td>
                            <td>${doc.type}</td>
                            <td>${doc.section} ${sourceMap[doc.source] || ''}</td>
                            <td>${doc.date}</td>
                            <td>${statusMap[doc.status] || ''}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="action-btn view" title="عرض"><i class="fas fa-eye"></i></button>
                                    <button class="action-btn edit" title="تعديل"><i class="fas fa-edit"></i></button>
                                    <button class="action-btn delete" title="حذف"><i class="fas fa-trash-alt"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                tableBody.innerHTML = html;
            }

            renderSampleTable();

            // معالج الأحداث على الجدول
            tableBody.addEventListener('click', function(e) {
                const btn = e.target.closest('.action-btn');
                if (!btn) return;
                const action = btn.classList.contains('view') ? 'عرض' :
                    btn.classList.contains('edit') ? 'تعديل' :
                    btn.classList.contains('delete') ? 'حذف' : '';
                alert(`📄 ${action} المرفق (محاكاة)`);
            });

            // فتح المودال
            const openModalBtn = document.getElementById('openAddModal');
            const modal = document.getElementById('addModal');
            if (openModalBtn && modal) {
                openModalBtn.addEventListener('click', function() {
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                });
                const closeModal = document.getElementById('closeModal');
                const cancelBtn = document.getElementById('cancelAdd');
                if (closeModal) closeModal.addEventListener('click', function() {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                });
                if (cancelBtn) cancelBtn.addEventListener('click', function() {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                });
                modal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        modal.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
            }

            // إضافة مستند
            const addForm = document.getElementById('addDocumentForm');
            if (addForm) {
                addForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    alert('✅ تم رفع المرفق بنجاح. جاري مراجعة المستند...');
                    const modal = document.getElementById('addModal');
                    if (modal) {
                        modal.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                    this.reset();
                    // إعادة تعيين واجهة الرفع
                    const uploadLabel = document.getElementById('uploadLabel');
                    if (uploadLabel) uploadLabel.textContent = 'اضغط لرفع الملف';
                    const fileNameDisplay = document.getElementById('fileNameDisplay');
                    if (fileNameDisplay) fileNameDisplay.textContent = '';
                });
            }

            // رفع الملفات
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

        console.log('✅ Attachments page initialized.');
    },

    // ============================================================
    // 10. دوال مساعدة لصفحة المعلومات الشخصية
    // ============================================================
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

// ============================================================
// تشغيل عند تحميل الصفحة
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    Profile.init();
});

// تصدير للاستخدام في بيئات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Profile;
}
