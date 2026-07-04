import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

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
    const { newEmail, userId, ipAddress, userAgent } = await req.json()
    if (!newEmail || !userId) {
      return new Response(
        JSON.stringify({ error: 'بيانات غير مكتملة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 1. الحصول على البريد الحالي للمستخدم
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'المستخدم غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const oldEmail = userData.user.email

    // 2. التحقق من عدم استخدام البريد الجديد
    const { data: existingUser, error: checkError } = await supabase
      .from('auth_register')
      .select('email')
      .eq('email', newEmail)
      .maybeSingle()

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني مستخدم مسبقاً' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. توليد OTP مكون من 8 أرقام
    const otp = Math.floor(10000000 + Math.random() * 90000000).toString()
    const otpHash = await bcrypt.hash(otp)

    // 4. حذف الطلبات السابقة غير المكتملة
    await supabase
      .from('email_change_requests')
      .delete()
      .eq('user_id', userId)
      .in('status', ['pending', 'verified'])

    // 5. إدراج طلب جديد
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5)

    const { error: insertError } = await supabase
      .from('email_change_requests')
      .insert({
        user_id: userId,
        old_email: oldEmail,
        new_email: newEmail,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        status: 'pending'
      })

    if (insertError) throw insertError

    // 6. إرسال البريد عبر Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY غير مضبوط')
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="UTF-8"><title>رمز التحقق - تغيير البريد الإلكتروني</title></head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #0d9488;">تيرا</h2>
          <h3 style="color: #1e293b;">تغيير البريد الإلكتروني</h3>
          <p style="color: #334155; line-height: 1.8;">استخدم الرمز التالي لتأكيد البريد الإلكتروني الجديد:</p>
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; border: 2px dashed #d1d5db; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0d9488;">${otp}</span>
          </div>
          <p style="color: #475569; font-size: 14px;">⏳ هذا الرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.</p>
          <div style="background-color: #fef2f2; border-right: 4px solid #dc2626; padding: 14px 18px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #7f1d1d; font-weight: 600;">⚠️ تنبيه أمني</p>
            <p style="color: #7f1d1d;">إذا لم تطلب هذا التغيير، يرجى تغيير كلمة المرور فوراً والتواصل مع الدعم.</p>
          </div>
          <hr style="border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">هذه رسالة تلقائية من منصة تيرا. يرجى عدم الرد عليها.</p>
        </div>
      </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'تيرا <support@tera-services.com>',
        to: [newEmail],
        subject: '🔐 رمز التحقق - تغيير البريد الإلكتروني',
        html: emailHtml
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Resend error:', errorText)
      throw new Error('فشل إرسال البريد الإلكتروني')
    }

    return new Response(
      JSON.stringify({ success: true, message: 'تم إرسال الرمز بنجاح' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'حدث خطأ أثناء إرسال الرمز' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
