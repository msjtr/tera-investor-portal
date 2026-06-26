/* ============================================================
   TERA INVESTOR PORTAL - SUPABASE CONNECTION CLIENT
   ============================================================ */

// 1. تحديد مفاتيح الربط (Project URL & Publishable Key)
const supabaseUrl = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
const supabaseKey = 'sb_publishable_QYc4AcGWtJGxalINA_UGZw_fjfVbGqg';

// 2. تهيئة الاتصال بقاعدة البيانات
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// رسالة تأكيد في لوحة المطورين (Console) للتحقق من نجاح التهيئة
console.log("تم تهيئة الاتصال بقاعدة بيانات تيرا بنجاح.");
