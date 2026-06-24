/**
 * ============================================
 * profile.js – الملف العام لوظائف الملف الشخصي
 * يحتوي على دوال مساعدة مشتركة بين صفحات المستخدم
 * ============================================
 */

/**
 * تنسيق التاريخ لعرضه بطريقة مفهومة
 * @param {string|Date} date - التاريخ المدخل
 * @returns {string} التاريخ المنسق (مثال: 15 يناير 2026)
 */
function formatProfileDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * التحقق من صحة البريد الإلكتروني (للاستخدام المشترك)
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * تحديث الصورة الرمزية (الأفاتار) بناءً على اسم المستخدم
 * @param {string} fullName - الاسم الكامل
 * @param {HTMLElement} avatarElement - العنصر المراد تحديثه
 */
function updateAvatar(fullName, avatarElement) {
    if (!avatarElement) return;
    if (fullName && fullName.trim()) {
        const initial = fullName.trim().charAt(0).toUpperCase();
        avatarElement.textContent = initial;
        avatarElement.style.backgroundColor = '#0A1B3F';
        avatarElement.style.color = '#fff';
    } else {
        avatarElement.textContent = 'م';
        avatarElement.style.backgroundColor = '#94a3b8';
    }
}

/**
 * عرض رسالة تأكيد عامة (تُستخدم في عدة صفحات)
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الرسالة (success, error, info)
 */
function showProfileAlert(message, type = 'info') {
    // هنا يمكنك تنفيذ نظام الإشعارات الخاص بك (مثل toastr أو alert مخصص)
    // نستخدم alert مؤقتاً للتوضيح
    alert(`[${type.toUpperCase()}] ${message}`);
}

/**
 * جلب بيانات المستخدم من التخزين المحلي أو من API
 * (دالة تمثيلية)
 * @returns {Object} بيانات المستخدم
 */
function getCurrentUserData() {
    // محاكاة لجلب البيانات
    return {
        name: 'محمد عبدالله الشمري',
        email: 'mohammed@example.com',
        nationality: 'السعودية',
        idType: 'national',
        gender: 'male'
    };
}

// =========================================
// تهيئة عامة عند تحميل الصفحة (تطبق على كل صفحات الملف الشخصي)
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    // مثال: تحديث الأفاتار تلقائياً إذا وجد عنصر يحمل class="profile-avatar"
    const avatarElements = document.querySelectorAll('.profile-avatar');
    const user = getCurrentUserData();
    avatarElements.forEach(el => {
        updateAvatar(user.name, el);
    });

    // مثال: ملء حقل البريد الإلكتروني إذا وجد
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.value = user.email;
    }

    // يمكنك إضافة تهيئات أخرى مشتركة هنا
    console.log('✅ profile.js تم تحميله بنجاح');
});
