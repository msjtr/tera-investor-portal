// في دالة submitForm داخل register.js:
async function submitForm() {
    // استخدام العميل المركزي
    const db = window.teraSupabase;
    
    if (!db) {
        alert("❌ تعذر الاتصال بقاعدة البيانات. تأكد من تحميل الملفات بالترتيب الصحيح.");
        return;
    }

    // ... باقي الكود كما هو ولكن استخدم db.auth.signUp بدلاً من supabase.auth.signUp
    try {
        const { data, error } = await db.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName, username: username, mobile_number: mobileNumber }
            }
        });
        // ... معالجة النتائج
    } catch (err) {
        console.error(err);
    }
}
