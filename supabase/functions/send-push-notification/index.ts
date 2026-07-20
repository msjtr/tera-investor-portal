/**
 * ============================================================
 * Edge Function: send-push-notification
 * المسار: supabase/functions/send-push-notification/index.ts
 * ============================================================
 * 
 * الهدف: إرسال Push Notification عبر OneSignal REST API
 * مع تسجيل الأخطاء وضمان عدم تأثير الفشل على النظام الرئيسي
 * 
 * آلية العمل:
 * 1. استقبال بيانات الإشعار (userId, title, body, url, icon, ...)
 * 2. البحث عن External ID للمستخدم (auth.users.id)
 * 3. إرسال الطلب إلى OneSignal REST API
 * 4. إرجاع حالة الإرسال (نجاح/فشل) مع تفاصيل الخطأ
 * ============================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── رؤوس CORS ───
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── دوال مساعدة للردود ───
function jsonResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function errorResponse(message: string, status: number = 500, details?: any) {
  console.error(`❌ [Push] ${message}`, details || '');
  return jsonResponse({ success: false, error: message, details }, status);
}

// ─── الوظيفة الرئيسية ───
Deno.serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();

  // ─── 1. معالجة CORS Preflight ───
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ─── 2. التحقق من طريقة الطلب ───
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // ─── 3. التحقق من التوكن ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized: Missing or invalid token', 401);
    }

    // ─── 4. قراءة البيانات ───
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return errorResponse('Invalid JSON payload', 400);
    }

    const { 
      userId, 
      externalId,
      title, 
      body, 
      url = null, 
      icon = null,
      data = {},
      silent = false 
    } = payload;

    // ─── 5. التحقق من البيانات المطلوبة ───
    if (!userId && !externalId) {
      return errorResponse('userId or externalId is required', 400);
    }

    if (!title) {
      return errorResponse('title is required', 400);
    }

    if (!body) {
      return errorResponse('body is required', 400);
    }

    const targetUserId = userId || externalId;

    // ─── 6. الحصول على متغيرات البيئة ───
    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const onesignalApiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!onesignalAppId || !onesignalApiKey) {
      console.error('❌ [Push] Missing OneSignal credentials');
      return errorResponse('Server configuration error: OneSignal credentials missing', 500);
    }

    // ─── 7. البحث عن Player ID للمستخدم ───
    let playerIds: string[] = [];

    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        
        // البحث عن اشتراكات Push النشطة للمستخدم
        const { data: subscriptions, error: subError } = await supabase
          .from('user_push_subscriptions')
          .select('player_id')
          .eq('user_id', targetUserId)
          .eq('is_active', true);

        if (!subError && subscriptions && subscriptions.length > 0) {
          playerIds = subscriptions.map(s => s.player_id).filter(id => id);
          console.log(`📨 [Push] Found ${playerIds.length} player IDs for user ${targetUserId}`);
        } else {
          console.log(`ℹ️ [Push] No active subscriptions found for user ${targetUserId}`);
        }
      } catch (e) {
        console.warn(`⚠️ [Push] Failed to fetch subscriptions:`, e);
      }
    }

    // ─── 8. في حال عدم وجود اشتراكات، استخدام Fallback ───
    // يمكنك تعديل هذا القسم حسب منطق النظام
    // مثلاً: إرسال إلى جميع الأجهزة المرتبطة بـ external_id
    if (playerIds.length === 0) {
      console.log(`ℹ️ [Push] No subscriptions found, sending to external_id: ${targetUserId}`);
      // سنرسل إلى external_id مباشرة عبر OneSignal
    }

    // ─── 9. بناء Payload لإرسال OneSignal ───
    const notificationPayload: any = {
      app_id: onesignalAppId,
      headings: { en: title, ar: title },
      contents: { en: body, ar: body },
      include_external_user_ids: [targetUserId],
      data: {
        ...data,
        url: url,
        icon: icon,
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      ...(url && { url: url }),
      ...(icon && { large_icon: icon, chrome_web_icon: icon }),
      ...(silent && { send_after: new Date().toISOString() }),
      // إعدادات إضافية لتحسين التجربة
      priority: 10,
      // إذا كان لدينا player_ids، نستخدمهم بدلاً من external_ids
      ...(playerIds.length > 0 && { include_player_ids: playerIds }),
    };

    // إذا كان لدينا player_ids، نزيل include_external_user_ids لتفادي الازدواجية
    if (playerIds.length > 0) {
      delete notificationPayload.include_external_user_ids;
    }

    console.log(`📨 [Push] Sending notification to ${playerIds.length > 0 ? playerIds.length : 'external_id'}`);

    // ─── 10. إرسال الطلب إلى OneSignal REST API ───
    const startTime = Date.now();
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${onesignalApiKey}`
      },
      body: JSON.stringify(notificationPayload)
    });

    const responseData = await response.json();
    const elapsed = Date.now() - startTime;

    // ─── 11. تحليل النتيجة ───
    if (response.ok && responseData.id) {
      console.log(`✅ [Push] Notification sent successfully: ${responseData.id} (${elapsed}ms)`);
      
      // تسجيل الإرسال في قاعدة البيانات (اختياري)
      if (supabaseUrl && serviceRoleKey) {
        try {
          const supabase = createClient(supabaseUrl, serviceRoleKey);
          await supabase
            .from('notification_logs')
            .insert({
              notification_id: responseData.id,
              user_id: targetUserId,
              title: title,
              body: body,
              status: 'sent',
              sent_at: new Date().toISOString(),
              request_id: requestId,
              metadata: { player_count: playerIds.length, elapsed }
            })
            .select();
        } catch (logError) {
          // تجاهل أخطاء التسجيل، لا تؤثر على عملية الإرسال
          console.warn(`⚠️ [Push] Failed to log notification:`, logError);
        }
      }

      return jsonResponse({
        success: true,
        notificationId: responseData.id,
        recipients: playerIds.length || 0,
        elapsed: elapsed,
        requestId: requestId
      }, 200);

    } else {
      // فشل الإرسال
      const errorMsg = responseData.errors?.[0] || responseData.error || 'Unknown error';
      console.error(`❌ [Push] Failed to send: ${errorMsg} (${response.status})`, responseData);

      // تسجيل الفشل
      if (supabaseUrl && serviceRoleKey) {
        try {
          const supabase = createClient(supabaseUrl, serviceRoleKey);
          await supabase
            .from('notification_logs')
            .insert({
              user_id: targetUserId,
              title: title,
              body: body,
              status: 'failed',
              sent_at: new Date().toISOString(),
              request_id: requestId,
              metadata: { error: errorMsg, status: response.status, response: responseData }
            });
        } catch (logError) { /* ignore */ }
      }

      return jsonResponse({
        success: false,
        error: errorMsg,
        status: response.status,
        requestId: requestId
      }, response.status);
    }

  } catch (err) {
    console.error(`❌ [Push] Unhandled error:`, err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
