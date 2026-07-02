const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(express.json());

// إعداد عميل Supabase بصلاحيات الخدمة (service_role)
// استبدل YOUR_SERVICE_ROLE_KEY بالمفتاح الفعلي من Supabase > Settings > API > service_role
const supabaseAdmin = createClient(
    'https://ucmzavrsgkfpypgewpbd.supabase.co',
    'YOUR_SERVICE_ROLE_KEY'
);

// نقطة نهاية لتغيير البريد الإلكتروني
app.post('/api/change-email', async (req, res) => {
    const { newEmail, accessToken } = req.body;

    if (!newEmail || !accessToken) {
        return res.status(400).json({ error: 'البريد أو الجلسة غير متوفرة' });
    }

    try {
        // التحقق من الجلسة
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
        if (authError || !user) {
            return res.status(401).json({ error: 'جلسة غير صالحة' });
        }

        // تغيير البريد مباشرة (مع تأكيده تلقائياً)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email: newEmail, email_confirm: true }
        );
        if (updateError) throw updateError;

        return res.json({ success: true, message: 'تم تغيير البريد بنجاح' });
    } catch (err) {
        console.error('فشل تغيير البريد:', err);
        return res.status(500).json({ error: err.message || 'فشل تغيير البريد' });
    }
});

// تقديم الملفات الثابتة (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '/')));

// لأي مسار غير معرف، أعد index.html (لتطبيقات الصفحة الواحدة)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
});
