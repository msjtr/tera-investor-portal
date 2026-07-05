import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

serve(async (req: Request) => {
  // معالجة طلب OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // إنشاء عميل Supabase مع Service Role Key (متاح فقط في الخادم)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1. التحقق من auth.users (نظام المصادقة الأساسي)
    let userExists = false
    let userActive = false

    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('خطأ في listUsers:', listError)
      } else if (users && users.users) {
        const foundUser = users.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
        if (foundUser) {
          userExists = true
          userActive = foundUser.confirmed_at !== null && !foundUser.banned && !foundUser.deleted
        }
      }
    } catch (err) {
      console.error('فشل الوصول إلى auth.users:', err)
    }

    // 2. التحقق من auth_register (جدول العملاء)
    let registerExists = false
    let registerActive = false

    try {
      const { data, error } = await supabase
        .from('auth_register')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (!error && data) {
        registerExists = true
        registerActive = (data.status === 'active' || data.status === 'Active' || data.status === 'ACTIVE')
      }
    } catch (err) {
      console.warn('فشل التحقق من auth_register:', err)
    }

    // 3. قرار استخدام البريد الإلكتروني (سياسة النظام)
    // إذا كان البريد موجوداً في auth.users، نمنع استخدامه نهائياً (حتى لو كان غير نشط)
    // هذا بسبب قيد Supabase Auth الذي يمنع وجود بريد مكرر
    const canUse = !userExists

    let message = ''
    let suggestion = ''

    if (userExists) {
      message = '✖ هذا البريد الإلكتروني مرتبط بحساب آخر ولا يمكن استخدامه.'
      suggestion = 'يرجى استخدام بريد إلكتروني آخر.'
    } else if (registerExists && registerActive) {
      // البريد موجود في auth_register فقط (نادراً) أو الحالة نشطة
      // لكن لا يوجد في auth.users، وهذا يعني أن البيانات غير متسقة، يمكن السماح أو المنع حسب السياسة
      // سنمنع احتياطياً
      message = '✖ هذا البريد الإلكتروني مرتبط بحساب آخر ولا يمكن استخدامه.'
      suggestion = 'يرجى استخدام بريد إلكتروني آخر.'
      // يمكن تغيير هذا حسب السياسة
    } else {
      message = '✅ البريد الإلكتروني متاح للاستخدام.'
    }

    return new Response(
      JSON.stringify({
        exists: userExists || registerExists,
        active: userActive || registerActive,
        canUse: canUse,
        userExists,
        registerExists,
        message,
        suggestion,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('خطأ في Edge Function:', error)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء التحقق من البريد' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
