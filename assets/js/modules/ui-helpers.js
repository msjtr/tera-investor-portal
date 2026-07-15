/**
 * modules/ui-helpers.js – دوال مساعدة شاملة لواجهة المستخدم (محمية من التعارضات)
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
    // إشعارات (Toast) – محمية من تعارض CSS
    // ═══════════════════════════════════════
    function showToast(message, type = 'info', duration = 4000) {
        const container = getToastContainer();
        const toast = document.createElement('div');
        // أنماط مضمنة لتجنب الاعتماد على ملفات CSS خارجية
        const bgColors = {
            info: '#028090',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#dc2626',
            error: '#dc2626'
        };
        const bg = bgColors[type] || bgColors.info;
        toast.style.cssText = `
            background: ${bg}; color: white; padding: 12px 20px; border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2); display: flex; align-items: center;
            gap: 12px; font-size: 14px; font-family: 'Tajawal', sans-serif;
            opacity: 1; transform: translateX(0); transition: all 0.3s ease;
            max-width: 360px; word-break: break-word;
        `;
        toast.innerHTML = `
            <span style="flex:1;">${message}</span>
            <button class="toast-close" style="background:transparent; border:none; color:white; font-size:18px; cursor:pointer; line-height:1;">×</button>
        `;
        container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => removeToast(toast));
        setTimeout(() => removeToast(toast), duration);
        return toast;
    }

    function getToastContainer() {
        let container = document.getElementById('tera-ui-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tera-ui-toast-container';
            container.style.cssText = `
                position:fixed; top:20px; right:20px; z-index:99999;
                display:flex; flex-direction:column; gap:8px; pointer-events:none;
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
    function showLoading(message = 'جاري التحميل...') {
        hideLoading();
        const overlay = document.createElement('div');
        overlay.className = 'tera-ui-loading-overlay';
        overlay.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(255,255,255,0.85); display:flex;
            flex-direction:column; justify-content:center; align-items:center;
            z-index: 99998; font-family: 'Tajawal', sans-serif;
        `;
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px; height: 40px; border: 4px solid #e2e8f0;
            border-top-color: #028090; border-radius: 50%;
            animation: tera-spin 0.8s linear infinite; margin-bottom: 16px;
        `;
        const text = document.createElement('p');
        text.textContent = message;
        text.style.cssText = 'color:#334155; font-size:15px; margin:0;';
        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);

        // حقن animation keyframe مرة واحدة
        if (!document.getElementById('tera-spinner-keyframes')) {
            const style = document.createElement('style');
            style.id = 'tera-spinner-keyframes';
            style.textContent = '@keyframes tera-spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        return overlay;
    }

    function hideLoading() {
        document.querySelectorAll('.tera-ui-loading-overlay').forEach(el => el.remove());
    }

    // ═══════════════════════════════════════
    // نوافذ حوارية (تأكيد، تنبيه) – محمية
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
        overlay.className = 'tera-ui-modal-overlay';
        overlay.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.5); display:flex; justify-content:center;
            align-items:center; z-index:100000; font-family: 'Tajawal', sans-serif;
        `;
        const box = document.createElement('div');
        box.className = 'tera-ui-modal-box';
        box.style.cssText = `
            background:white; padding:24px; border-radius:12px;
            min-width:300px; max-width:90%; text-align:center;
            box-shadow:0 10px 40px rgba(0,0,0,0.2); direction: rtl;
        `;
        box.innerHTML = `<p style="font-size:1.1rem; margin-bottom:20px; color:#0A1B3F;">${message}</p>`;

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap;';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.style.cssText = 'padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:600; font-family:inherit;';
            if (btn.class === 'btn-primary') {
                button.style.cssText += 'background:#028090; color:white; border:none;';
            } else {
                button.style.cssText += 'background:#e2e8f0; color:#334155; border:none;';
            }
            button.addEventListener('click', btn.callback);
            btnContainer.appendChild(button);
        });

        box.appendChild(btnContainer);
        overlay.appendChild(box);

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
        formatDate,
        formatTimeAgo,
        getStatusLabel,
        updateHeader,
        getInitials,
        showToast,
        showLoading,
        hideLoading,
        showConfirm,
        showAlert,
        showElement,
        hideElement,
        toggleElement,
        copyToClipboard,
        formatCurrency,
        formatNumber
    };
})();
