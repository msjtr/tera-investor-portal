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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1. التحقق من auth.users
    let userExists = false
    let userActive = false
    let userConfirmed = false

    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      if (!listError && users?.users) {
        const foundUser = users.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
        if (foundUser) {
          userExists = true
          userConfirmed = foundUser.confirmed_at !== null
          userActive = userConfirmed && !foundUser.banned && !foundUser.deleted
        }
      }
    } catch (err) {
      console.error('فشل الوصول إلى auth.users:', err)
    }

    // 2. التحقق من auth_register
    let registerExists = false
    let registerActive = false
    let registerStatus = null

    try {
      const { data, error } = await supabase
        .from('auth_register')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (!error && data) {
        registerExists = true
        registerStatus = data.status
        registerActive = (data.status === 'active' || data.status === 'Active' || data.status === 'ACTIVE')
      }
    } catch (err) {
      console.warn('فشل التحقق من auth_register:', err)
    }

    // 3. سياسة النظام
    let canUse = false
    let message = ''
    let suggestion = ''

    if (userExists && userActive) {
      canUse = false
      message = '✖ هذا البريد الإلكتروني مرتبط بحساب نشط ولا يمكن استخدامه.'
      suggestion = 'يرجى استخدام بريد إلكتروني آخر.'
    } else if (userExists && !userActive) {
      canUse = true
      message = '⚠️ هذا البريد الإلكتروني مرتبط بحساب غير نشط. سيتم استبداله بعد التحقق.'
      suggestion = 'يرجى التأكد من أنك تملك صلاحية الوصول إلى هذا البريد.'
    } else if (registerExists && registerActive) {
      canUse = false
      message = '✖ هذا البريد الإلكتروني مرتبط بحساب نشط ولا يمكن استخدامه.'
      suggestion = 'يرجى استخدام بريد إلكتروني آخر.'
    } else {
      canUse = true
      message = '✅ البريد الإلكتروني متاح للاستخدام.'
    }

    return new Response(
      JSON.stringify({
        exists: userExists || registerExists,
        active: userActive || registerActive,
        canUse,
        userExists,
        userActive,
        userConfirmed,
        registerExists,
        registerStatus,
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
