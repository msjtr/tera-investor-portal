// Follow this setup guide to integrate the Deno runtime and Supabase functions:
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── التحقق الفعلي من هوية المتصل ───
// كان هذا الملف سابقاً بلا أي تحقق من الهوية على الإطلاق، مما يسمح لأي طرف
// بإرسال إشعارات push مزيّفة لأي مستخدم. الآن نطلب إما:
//  (أ) مفتاح service_role (للاستدعاء الداخلي من send-notification فقط)، أو
//  (ب) توكن مستخدم حقيقي وصالح — وفي هذه الحالة نقيّد الاستهداف بالمستخدم نفسه فقط.
async function authenticateCaller(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, isService: false, userId: null as string | null };
  }
  const token = authHeader.replace("Bearer ", "").trim();

  if (SUPABASE_SERVICE_ROLE_KEY && token === SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, isService: true, userId: null as string | null };
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, isService: false, userId: null };
  }
  return { ok: true, isService: false, userId: data.user.id };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await authenticateCaller(req.headers.get("Authorization"));
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { userId, playerIds, title, body, url, data, silent } = await req.json();

    if ((!userId && !playerIds) || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ الاستدعاءات غير الداخلية (من مستخدم حقيقي) لا يمكنها استهداف مستخدم آخر عبر userId
    if (!auth.isService && userId && userId !== auth.userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: cannot target another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title, ar: title },
      contents: { en: body, ar: body },
      data: data || {},
      url: url || undefined,
      priority: 10,
    };

    // If playerIds are provided, send directly to those devices
    if (playerIds && playerIds.length > 0) {
      payload.include_player_ids = playerIds;
    } else if (userId) {
      // Otherwise use external_id (assuming userId equals external_id)
      payload.include_external_user_ids = [userId];
    }

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.id) {
      return new Response(
        JSON.stringify({ success: true, notificationId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result.errors || result }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
