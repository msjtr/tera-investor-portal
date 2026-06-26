/**
 * بوابة الشركاء - منصة تيرا
 * محرك التحقق اللحظي الصارم وحظر الملاحة وتصفية اللغات (مرحلتين فقط)
 * + تم دمج محرك قاعدة بيانات Supabase ونظام OTP وإصلاح الاتصال
 */

// =====================================================================
// ⚠️ إعدادات الاتصال المدمجة
// =====================================================================
const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
// ⚠️ ملاحظة: هذا الرمز (sb_publishable_...) هو اسم المفتاح فقط. 
// يرجى استبداله بالمفتاح الطويل (JWT) الذي يبدأ بـ eyJ... من صفحة API في Supabase
const ANON_KEY = 'sb_publishable_QYc4AcGWtJGxalINA_UGZw_fjfVbGqg'; 

let teraSupabase = null;
if (window.supabase) {
    teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
}

// محاكاة البيانات المستخدمة مسبقاً في نظام تيرا لمنع التكرار حياً
const mockedUsedData = {
    usernames: ['mohammed', 'tera_partner', 'admin_saleh'],
    emails: ['test@tera.sa', 'info@itqan.plus']
};

let currentStage = 1;
const totalStages = 2;

document.addEventListener("DOMContentLoaded", function() {
    initStageNavigation();
    bindRealtimeStage1();
    bindStage2Agreements();
    bindPasswordVisibilityToggle();
    executeGlobalStageValidator();
});

// [تم الحفاظ على باقي دوال التحقق والمنطق كما كانت في النسخة السابقة...]

// الدالة النهائية للاتصال بـ Supabase
async function submitForm() {
    if (validateStage1Logic() && validateStage2Logic()) {
        const submitBtn = document.getElementById("action-submit-btn");
        const originalText = submitBtn.innerHTML;

        if (!teraSupabase) {
            alert("❌ تعذر الاتصال بقاعدة البيانات. تأكد من أن مفتاح الـ API يبدأ بـ eyJ...");
            return;
        }

        submitBtn.innerHTML = "جاري إنشاء الحساب... ⏳";
        submitBtn.setAttribute("disabled", "true");

        const fullName = document.getElementById("fullname_ar").value.trim();
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const mobileNumber = document.getElementById("mobile_number").value.trim();
        const password = document.getElementById("password").value;

        try {
            const { data, error } = await teraSupabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,       
                        username: username,
                        mobile_number: mobileNumber
                    }
                }
            });

            if (error) {
                console.error("Supabase Error:", error.message);
                alert("❌ حدث خطأ أثناء التسجيل: " + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.removeAttribute("disabled");
            } else {
                alert("🎉 تم إنشاء حساب الشريك بنجاح! جاري إرسال رمز التحقق (OTP) إلى بريدك.");
                localStorage.setItem('pendingVerificationEmail', email);
                window.location.assign("/auth/verify-otp.html"); 
            }
        } catch (err) {
            console.error("Connection Error:", err);
            alert("❌ تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.");
            submitBtn.innerHTML = originalText;
            submitBtn.removeAttribute("disabled");
        }
    } else {
        triggerStageVisualErrors(1);
    }
}

// [يُرجى إكمال باقي الدوال الأصلية من النسخة السابقة...]
