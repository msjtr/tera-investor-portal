/**
 * ============================================================
 * supabase/functions/update-notification/index.ts
 * الإصدار النهائي – متوافق مع جدول notifications الحالي
 * ============================================================
 * بناءً على هيكل الجدول الذي يحتوي على:
 * - status (text): unread, read, archived, deleted
 * - is_read (boolean): true/false
 * - read_at, archived_at, deleted_at (timestamptz)
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
  console.error(`❌ [${status}] ${message}`, details || '');
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

    const { id, ...updates } = payload;

    // ─── 5. التحقق من البيانات ───
    if (!id) {
      return errorResponse('id is required', 400);
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No fields to update', 400);
    }

    // ─── 6. إنشاء عميل Supabase ───
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables');
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ─── 7. معالجة التحديثات بشكل ذكي ───
    // هذه الخريطة تحدد العلاقة بين الحالة والحقول الزمنية
    const statusTimeMap: Record<string, { field: string; value: string }> = {
      'read': { field: 'read_at', value: new Date().toISOString() },
      'archived': { field: 'archived_at', value: new Date().toISOString() },
      'deleted': { field: 'deleted_at', value: new Date().toISOString() },
    };

    // إذا كان التحديث يحتوي على status، نضيف الحقل الزمني المناسب تلقائياً
    if (updates.status && statusTimeMap[updates.status]) {
      const { field, value } = statusTimeMap[updates.status];
      // لا نضيف الحقل الزمني إذا كان موجوداً بالفعل في updates
      if (!(field in updates)) {
        updates[field] = value;
      }
    }

    // إذا كان status = 'read'، نضبط is_read = true (للتوافق مع الكود الأمامي)
    if (updates.status === 'read' && !('is_read' in updates)) {
      updates.is_read = true;
    }

    // إذا كان status = 'unread'، نضبط is_read = false
    if (updates.status === 'unread' && !('is_read' in updates)) {
      updates.is_read = false;
    }

    // ─── 8. تنفيذ التحديث ───
    console.log(`📝 [${requestId}] Updating notification ${id} with:`, Object.keys(updates));

    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`❌ [${requestId}] Database error:`, error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    if (!data || data.length === 0) {
      return errorResponse('Notification not found', 404);
    }

    console.log(`✅ [${requestId}] Notification ${id} updated successfully`);
    return jsonResponse({ success: true, data: data[0] });

  } catch (err) {
    console.error(`❌ [${requestId}] Unhandled error:`, err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
