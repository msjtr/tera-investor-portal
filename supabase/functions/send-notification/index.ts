/**
 * ============================================================
 * Edge Function: send-notification (معدل)
 * المسار: supabase/functions/send-notification/index.ts
 * ============================================================
 * 
 * هذه الدالة مسؤولة عن إنشاء الإشعار في قاعدة البيانات
 * ثم إرسال Push Notification عبر OneSignal
 * 
 * تم تعديلها لتشمل استدعاء send-push-notification
 * بعد حفظ الإشعار بنجاح
 * ============================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── رؤوس CORS ───
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function errorResponse(message: string, status: number = 500) {
  console.error(`❌ [Send] ${message}`);
  return jsonResponse({ success: false, error: message }, status);
}

// ─── دالة لإرسال Push Notification ───
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  actionUrl: string | null,
  metadata: any,
  isSilent: boolean,
  authToken: string
): Promise<{ success: boolean; error?: string; notificationId?: string }> {
  try {
    const functionsUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1/send-push-notification';
    
    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      body: JSON.stringify({
        userId: userId,
        title: title,
        body: body,
        url: actionUrl || null,
        icon: metadata?.icon || null,
        data: metadata || {},
        silent: isSilent || false
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      return { success: true, notificationId: result.notificationId };
    } else {
      console.warn(`⚠️ [Send] Push notification failed:`, result.error);
      return { success: false, error: result.error || 'Unknown push error' };
    }
  } catch (err) {
    console.warn(`⚠️ [Send] Push notification error:`, err);
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    const { 
      userId, 
      title, 
      body, 
      type = 'general', 
      priority = 'normal',
      sender = 'النظام',
      actionUrl = null,
      imageUrl = null,
      metadata = {},
      isSilent = false,
      expiresAt = null
    } = payload;

    if (!userId || !title || !body) {
      return errorResponse('Missing required fields: userId, title, body', 400);
    }

    // ─── 1. حفظ الإشعار في قاعدة البيانات ───
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: title,
        body: body,
        type: type,
        priority: priority,
        status: 'unread',
        sender: sender,
        action_url: actionUrl,
        image_url: imageUrl,
        metadata: metadata,
        is_silent: isSilent,
        is_read: false,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ [Send] Database error:', dbError);
      return errorResponse(`Database error: ${dbError.message}`, 500);
    }

    console.log(`✅ [Send] Notification ${notification.id} created for user ${userId}`);

    // ─── 2. إرسال Push Notification (لا ننتظر النتيجة) ───
    // يتم الإرسال في الخلفية، ولا يؤثر على استجابة API
    const pushResult = await sendPushNotification(
      userId,
      title,
      body,
      actionUrl,
      { ...metadata, notification_id: notification.id },
      isSilent,
      authHeader
    );

    if (pushResult.success) {
      console.log(`✅ [Send] Push sent: ${pushResult.notificationId}`);
    } else {
      console.warn(`⚠️ [Send] Push failed: ${pushResult.error}`);
    }

    // ─── 3. إرجاع النتيجة ───
    return jsonResponse({
      success: true,
      notificationId: notification.id,
      push: {
        sent: pushResult.success,
        notificationId: pushResult.notificationId || null,
        error: pushResult.error || null
      }
    }, 200);

  } catch (err) {
    console.error('❌ [Send] Function error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
