// supabase/functions/change-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // السماح فقط بطلبات POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { newEmail } = await req.json();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return new Response(JSON.stringify({ error: "بريد إلكتروني غير صالح" }), { status: 400 });
    }

    // الحصول على جلسة المستخدم من Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401 });
    }

    // تهيئة عميل Supabase مع صلاحيات الخدمة (service_role)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // التحقق من جلسة المستخدم واستخراج user_id
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "جلسة غير صالحة" }), { status: 401 });
    }

    // تغيير البريد الإلكتروني مباشرة باستخدام Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email: newEmail, email_confirm: true } // تأكيد البريد فورًا
    );

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, message: "تم تغيير البريد الإلكتروني بنجاح" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Change email error:", err);
    return new Response(JSON.stringify({ error: "حدث خطأ داخلي" }), { status: 500 });
  }
});
