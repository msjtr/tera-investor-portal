/**
 * ============================================================
 * Edge Function: onesignal-webhook
 * المسار: supabase/functions/onesignal-webhook/index.ts
 * ============================================================
 * 
 * تستقبل Webhook من OneSignal عند إرسال إشعار،
 * وتحفظ الإشعار في جدول notifications في Supabase.
 * 
 * 🔐 الأمان: تستخدم مفتاح سري (ONESIGNAL_WEBHOOK_SECRET)
 * للتحقق من صحة الطلب.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // معالجة CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. التحقق من المصادقة (مفتاح سري)
    const authHeader = req.headers.get("Authorization");
    const expectedKey = Deno.env.get("ONESIGNAL_WEBHOOK_SECRET");
    
    // إذا تم تعيين المفتاح السري، تحقق منه
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      console.warn("⚠️ Unauthorized webhook request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. قراءة بيانات webhook من OneSignal
    const payload = await req.json();
    console.log("📨 OneSignal webhook received:", JSON.stringify(payload, null, 2));

    // 3. استخراج البيانات المهمة من payload
    // وثائق OneSignal: https://documentation.onesignal.com/docs/webhook-notifications
    const notificationData = payload.notification || payload;
    const recipients = payload.recipients || [];

    // استخراج أول مستخدم (الإشعارات الجماعية قد تحتوي على عدة مستخدمين)
    const recipient = recipients[0] || {};

    // الحصول على external_id (وهو user_id في نظامنا)
    const userId = recipient.external_id || notificationData.external_id || null;

    if (!userId) {
      console.warn("⚠️ No external_id in webhook payload, skipping DB save");
      return new Response(
        JSON.stringify({ success: true, message: "No external_id found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. إنشاء عميل Supabase (باستخدام Service Role Key)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 5. حفظ الإشعار في قاعدة البيانات
    const title = notificationData.headings?.ar || 
                  notificationData.headings?.en || 
                  notificationData.title || 
                  "إشعار من OneSignal";

    const body = notificationData.contents?.ar || 
                 notificationData.contents?.en || 
                 notificationData.body || 
                 "";

    const actionUrl = notificationData.url || 
                      notificationData.launch_url || 
                      notificationData.data?.action_url || 
                      null;

    const additionalData = notificationData.data || notificationData.additional_data || {};

    const { data: notification, error: dbError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: title,
        body: body,
        type: additionalData.type || "system",
        priority: additionalData.priority || "normal",
        status: "unread",
        is_read: false,
        action_url: actionUrl,
        data: additionalData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: "OneSignal",
        metadata: {
          onesignal_id: notificationData.id,
          platform: notificationData.platform || "web"
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Notification ${notification.id} saved from OneSignal webhook for user ${userId}`);

    // 6. إرجاع النجاح
    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        userId: userId,
        message: "Notification saved successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
