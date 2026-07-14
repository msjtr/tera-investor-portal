/**
 * modules/ui-helpers.js - دوال مساعدة شاملة لواجهة المستخدم
 */
(function() {
    'use strict';

    // ═══════════════════════════════════════
    // تنسيق التاريخ والوقت
    // ═══════════════════════════════════════
    function formatDate(d, options = {}) {
        if (!d) return '-';
        const date = new Date(d);
        if (isNaN(date)) return '-';
        const opts = { dateStyle: 'medium', timeStyle: 'short', ...options };
        return new Intl.DateTimeFormat('ar-SA', opts).format(date);
    }

    function formatTimeAgo(d) {
        if (!d) return '-';
        const now = new Date();
        const past = new Date(d);
        const seconds = Math.floor((now - past) / 1000);
        if (seconds < 60) return 'الآن';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `قبل ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `قبل ${hours} ساعة`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `قبل ${days} يوم`;
        const months = Math.floor(days / 30);
        if (months < 12) return `قبل ${months} شهر`;
        return `قبل ${Math.floor(months / 12)} سنة`;
    }

    // ═══════════════════════════════════════
    // تسميات الحالات
    // ═══════════════════════════════════════
    function getStatusLabel(status) {
        const labels = {
            active: 'نشطة',
            logged_out: 'تم تسجيل الخروج',
            timeout: 'انتهت بسبب عدم النشاط',
            terminated_by_system: 'أنهيت بواسطة النظام',
            terminated_by_user: 'أنهيت بواسطة المستخدم',
            pending: 'قيد الانتظار',
            approved: 'مقبولة',
            rejected: 'مرفوضة',
            completed: 'مكتملة',
            failed: 'فشلت'
        };
        return labels[status] || status;
    }

    // ═══════════════════════════════════════
    // رأس الصفحة (اسم المستخدم والصورة الرمزية)
    // ═══════════════════════════════════════
    function updateHeader(user) {
        const name = user?.user_metadata?.full_name || user?.email || 'مستخدم';
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) {
            avatarEl.textContent = getInitials(name);
        }
    }

    function getInitials(fullName) {
        if (!fullName) return '?';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // ═══════════════════════════════════════
    // إشعارات (Toast)
    // ═══════════════════════════════════════
    function showToast(message, type = 'info', duration = 4000) {
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close">×</button>
        `;
        container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => removeToast(toast));
        setTimeout(() => removeToast(toast), duration);
        return toast;
    }

    function getToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position:fixed; top:20px; right:20px; z-index:99999;
                display:flex; flex-direction:column; gap:8px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    function removeToast(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }

    // ═══════════════════════════════════════
    // مؤشر التحميل (Spinner)
    // ═══════════════════════════════════════
    function showLoading(message = 'جاري التحميل...', target = document.body) {
        hideLoading(); // إزالة أي مؤشر سابق
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        overlay.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(255,255,255,0.8); display:flex;
            flex-direction:column; justify-content:center; align-items:center;
            z-index: 99998;
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function hideLoading() {
        document.querySelectorAll('.loading-overlay').forEach(el => el.remove());
    }

    // ═══════════════════════════════════════
    // نوافذ حوارية (تأكيد، تنبيه)
    // ═══════════════════════════════════════
    function showConfirm(message, onConfirm, onCancel) {
        const modal = createModal(message, [
            { text: 'نعم', class: 'btn-primary', callback: () => { closeModal(modal); onConfirm?.(); } },
            { text: 'إلغاء', class: 'btn-secondary', callback: () => { closeModal(modal); onCancel?.(); } }
        ]);
        return modal;
    }

    function showAlert(message, onClose) {
        const modal = createModal(message, [
            { text: 'حسناً', class: 'btn-primary', callback: () => { closeModal(modal); onClose?.(); } }
        ]);
        return modal;
    }

    function createModal(message, buttons) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.5); display:flex; justify-content:center;
            align-items:center; z-index:100000;
        `;
        const box = document.createElement('div');
        box.className = 'modal-box';
        box.style.cssText = `
            background:white; padding:24px; border-radius:12px;
            min-width:300px; max-width:90%; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.2);
        `;
        box.innerHTML = `<p style="font-size:1.1rem; margin-bottom:20px;">${message}</p>`;

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap;';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.className = `btn ${btn.class}`;
            button.style.cssText = 'padding:8px 20px; border-radius:6px; cursor:pointer;';
            button.addEventListener('click', btn.callback);
            btnContainer.appendChild(button);
        });

        box.appendChild(btnContainer);
        overlay.appendChild(box);

        // إغلاق عند النقر خارج الصندوق
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay);
        });

        document.body.appendChild(overlay);
        return overlay;
    }

    function closeModal(overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s';
        setTimeout(() => overlay.remove(), 200);
    }

    // ═══════════════════════════════════════
    // دوال مساعدة للعناصر
    // ═══════════════════════════════════════
    function showElement(id) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.style.display = '';
    }

    function hideElement(id) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.style.display = 'none';
    }

    function toggleElement(id) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
    }

    // نسخ النص إلى الحافظة
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('تم النسخ بنجاح', 'success');
        } catch (err) {
            showToast('فشل النسخ', 'error');
        }
    }

    // تنسيق العملة (ريال سعودي)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
    }

    // تنسيق الأرقام
    function formatNumber(num) {
        return new Intl.NumberFormat('ar-SA').format(num);
    }

    // ═══════════════════════════════════════
    // واجهة عامة
    // ═══════════════════════════════════════
    window.UIHelpers = {
        // التواريخ
        formatDate,
        formatTimeAgo,
        // الحالات والتسميات
        getStatusLabel,
        // رأس المستخدم
        updateHeader,
        getInitials,
        // الإشعارات
        showToast,
        // التحميل
        showLoading,
        hideLoading,
        // الحوارات
        showConfirm,
        showAlert,
        // العناصر
        showElement,
        hideElement,
        toggleElement,
        // الحافظة والتنسيق
        copyToClipboard,
        formatCurrency,
        formatNumber
    };
})();
