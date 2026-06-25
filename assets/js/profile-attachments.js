/**
 * ============================================================
 * المرفقات والوثائق - Attachments
 * ============================================================
 * الموقع: /assets/js/profile-attachments.js
 * ============================================================
 */

const ProfilePages = ProfilePages || {};

ProfilePages['attachments'] = {
    // بيانات تجريبية
    documents: [
        { id: 1, name: 'الهوية الوطنية سارية', type: 'هوية وطنية', section: 'المعلومات الشخصية', date: '2026-06-20',
            status: 'approved', source: 'auto', file: 'id_card.pdf' },
        { id: 2, name: 'شهادة آيبان بنك الراجحي', type: 'شهادة آيبان', section: 'المعلومات البنكية', date: '2026-06-22',
            status: 'pending', source: 'auto', file: 'iban_rajhi.pdf' },
        { id: 3, name: 'كشف حساب شهر يونيو', type: 'كشف حساب بنكي', section: 'المعلومات البنكية', date: '2026-06-24',
            status: 'rejected', source: 'manual', file: 'statement_june.pdf' },
        { id: 4, name: 'عقد إيجار السكن', type: 'عقد إيجار', section: 'العنوان الوطني', date: '2026-06-18',
            status: 'update_needed', source: 'manual', file: 'rent_contract.pdf' },
        { id: 5, name: 'جواز السفر ساري', type: 'جواز سفر', section: 'المعلومات الشخصية', date: '2026-06-10',
            status: 'approved', source: 'auto', file: 'passport.pdf' },
        { id: 6, name: 'فاتورة كهرباء أبريل', type: 'إثبات عنوان', section: 'العنوان الوطني', date: '2026-06-15',
            status: 'pending', source: 'manual', file: 'electricity_bill.pdf' },
        { id: 7, name: 'صورة الهوية الخلفية', type: 'هوية وطنية', section: 'المعلومات الشخصية', date: '2026-06-25',
            status: 'approved', source: 'auto', file: 'id_card_back.pdf' }
    ],

    nextId: 8,

    init: function() {
        console.log('📎 Initializing Attachments page...');

        const tableBody = document.getElementById('documentsTableBody');
        if (!tableBody) {
            console.warn('⚠️ Attachments elements not found.');
            return;
        }

        this.renderTable();
        this.initModal();
        this.initFileUpload();
        this.initAddDocument();
        this.initTableActions();

        console.log('✅ Attachments page initialized.');
    },

    getStatusBadge: function(status) {
        const map = {
            'approved': '<span class="status-badge status-approved"><i class="fas fa-circle"></i> معتمد</span>',
            'pending': '<span class="status-badge status-pending"><i class="fas fa-circle"></i> قيد المراجعة</span>',
            'rejected': '<span class="status-badge status-rejected"><i class="fas fa-circle"></i> مرفوض</span>',
            'update_needed': '<span class="status-badge status-update"><i class="fas fa-circle"></i> يحتاج تحديث</span>'
        };
        return map[status] || map.pending;
    },

    getSourceTag: function(source) {
        if (source === 'auto') {
            return '<span class="source-tag auto"><i class="fas fa-sync-alt"></i> تلقائي</span>';
        }
        return '<span class="source-tag manual"><i class="fas fa-user-edit"></i> يدوي</span>';
    },

    getStatusText: function(status) {
        const map = {
            'approved': 'معتمد',
            'pending': 'قيد المراجعة',
            'rejected': 'مرفوض',
            'update_needed': 'يحتاج تحديث'
        };
        return map[status] || status;
    },

    renderTable: function() {
        const tbody = document.getElementById('documentsTableBody');
        if (!tbody) return;

        if (this.documents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px 20px; color:#94a3b8; font-weight:700;">
                        <i class="fas fa-folder-open" style="font-size:24px; display:block; margin-bottom:10px;"></i>
                        لا توجد مستندات مرفوعة حالياً
                    </td>
                </tr>
            `;
            this.updateStats();
            return;
        }

        let html = '';
        this.documents.forEach((doc, index) => {
            const statusBadge = this.getStatusBadge(doc.status);
            const sourceTag = this.getSourceTag(doc.source);

            html += `
                <tr data-id="${doc.id}">
                    <td>${index + 1}</td>
                    <td class="text-title">${doc.name}</td>
                    <td>${doc.type}</td>
                    <td>${doc.section} ${sourceTag}</td>
                    <td>${doc.date}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn view" title="عرض" data-id="${doc.id}"><i class="fas fa-eye"></i></button>
                            ${doc.status === 'rejected' || doc.status === 'update_needed' ? 
                                `<button class="action-btn upload" title="إعادة رفع" data-id="${doc.id}"><i class="fas fa-upload"></i></button>` : 
                                `<button class="action-btn edit" title="تعديل" data-id="${doc.id}"><i class="fas fa-edit"></i></button>`
                            }
                            <button class="action-btn delete" title="حذف" data-id="${doc.id}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        this.updateStats();
    },

    updateStats: function() {
        const total = this.documents.length;
        const approved = this.documents.filter(d => d.status === 'approved').length;
        const pending = this.documents.filter(d => d.status === 'pending').length;
        const rejected = this.documents.filter(d => d.status === 'rejected' || d.status === 'update_needed').length;

        const totalEl = document.getElementById('totalDocs');
        const approvedEl = document.getElementById('approvedDocs');
        const pendingEl = document.getElementById('pendingDocs');
        const rejectedEl = document.getElementById('rejectedDocs');

        if (totalEl) totalEl.textContent = total;
        if (approvedEl) approvedEl.textContent = approved;
        if (pendingEl) pendingEl.textContent = pending;
        if (rejectedEl) rejectedEl.textContent = rejected;
    },

    initModal: function() {
        const modal = document.getElementById('addModal');
        const openBtn = document.getElementById('openAddModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelAdd');

        const openModal = () => {
            if (!modal) return;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            const form = document.getElementById('addDocumentForm');
            if (form) form.reset();
            const uploadLabel = document.getElementById('uploadLabel');
            if (uploadLabel) uploadLabel.textContent = 'اضغط لرفع الملف';
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            const fileInput = document.getElementById('docFile');
            if (fileInput) fileInput.value = '';
        };

        const closeModal = () => {
            if (!modal) return;
            modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (openBtn) openBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) closeModal();
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) closeModal();
        });
    },

    initFileUpload: function() {
        const uploadZone = document.getElementById('docUploadZone');
        const fileInput = document.getElementById('docFile');
        const uploadLabel = document.getElementById('uploadLabel');
        const fileNameDisplay = document.getElementById('fileNameDisplay');

        if (!uploadZone || !fileInput) return;

        uploadZone.addEventListener('click', function(e) {
            e.stopPropagation();
            fileInput.click();
        });

        fileInput.addEventListener('change', function(e) {
            e.stopPropagation();
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    alert('حجم الملف يتجاوز الحد المسموح (10 ميجابايت).');
                    this.value = '';
                    return;
                }
                const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
                if (!allowedTypes.includes(file.type)) {
                    alert('صيغة الملف غير مسموحة. الصيغ المسموحة: PDF, JPG, JPEG, PNG');
                    this.value = '';
                    return;
                }
                if (uploadLabel) {
                    uploadLabel.textContent = file.name.length > 30 ? file.name.slice(0, 27) + '…' : file.name;
                    uploadLabel.style.color = '#028090';
                }
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' ك.ب)';
                    fileNameDisplay.style.color = '#10b981';
                }
            } else {
                if (uploadLabel) {
                    uploadLabel.textContent = 'اضغط لرفع الملف';
                    uploadLabel.style.color = '#0A1B3F';
                }
                if (fileNameDisplay) fileNameDisplay.textContent = '';
            }
        });
    },

    initAddDocument: function() {
        const addForm = document.getElementById('addDocumentForm');
        if (!addForm) return;

        addForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('docName').value.trim();
            const type = document.getElementById('docType').value;
            const section = document.getElementById('docSection').value;
            const description = document.getElementById('docDescription').value.trim();
            const file = document.getElementById('docFile').files[0];

            let valid = true;
            const nameField = document.getElementById('docName');
            const typeField = document.getElementById('docType');

            if (!name) { valid = false;
                nameField.classList.add('error'); } else { nameField.classList.remove('error'); }
            if (!type) { valid = false;
                typeField.classList.add('error'); } else { typeField.classList.remove('error'); }
            if (!file) { valid = false;
                alert('يرجى اختيار ملف للرفع.'); }

            if (!valid) {
                alert('يرجى ملء جميع الحقول المطلوبة.');
                return;
            }

            const now = new Date();
            const dateStr = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');

            const newDoc = {
                id: this.nextId++,
                name: name,
                type: type,
                section: section,
                date: dateStr,
                status: 'pending',
                source: section === 'مرفق يدوي' ? 'manual' : 'auto',
                file: file ? file.name : 'document.pdf',
                description: description
            };

            this.documents.push(newDoc);
            this.renderTable();
            this.closeModal();
            alert('✅ تم رفع المرفق بنجاح. جاري مراجعة المستند...');
        });
    },

    closeModal: function() {
        const modal = document.getElementById('addModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    initTableActions: function() {
        const tbody = document.getElementById('documentsTableBody');
        if (!tbody) return;

        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;

            const id = parseInt(btn.dataset.id);
            const doc = this.documents.find(d => d.id === id);
            if (!doc) return;

            const action = btn.classList.contains('view') ? 'view' :
                btn.classList.contains('edit') ? 'edit' :
                btn.classList.contains('delete') ? 'delete' :
                btn.classList.contains('upload') ? 'upload' : '';

            if (action === 'view') {
                alert('📄 عرض المرفق:\n' + doc.name + '\nالنوع: ' + doc.type + '\nالقسم: ' + doc.section +
                    '\nالحالة: ' + this.getStatusText(doc.status) + '\nالملف: ' + doc.file);
            } else if (action === 'edit') {
                const newName = prompt('تعديل اسم المرفق:', doc.name);
                if (newName && newName.trim()) {
                    doc.name = newName.trim();
                    this.renderTable();
                    alert('✅ تم تحديث اسم المرفق.');
                }
            } else if (action === 'delete') {
                if (confirm('هل أنت متأكد من حذف المرفق "' + doc.name + '"؟')) {
                    this.documents = this.documents.filter(d => d.id !== id);
                    this.renderTable();
                    alert('🗑️ تم حذف المرفق.');
                }
            } else if (action === 'upload') {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.pdf,.jpg,.jpeg,.png';
                fileInput.onchange = (e) => {
                    if (this.files && this.files.length > 0) {
                        const file = this.files[0];
                        const maxSize = 10 * 1024 * 1024;
                        if (file.size > maxSize) {
                            alert('حجم الملف يتجاوز الحد المسموح (10 ميجابايت).');
                            return;
                        }
                        doc.status = 'pending';
                        doc.file = file.name;
                        this.renderTable();
                        alert('✅ تم إعادة رفع المرفق "' + doc.name + '" بنجاح. جاري مراجعة المستند...');
                    }
                };
                fileInput.click();
            }
        });
    }
};
