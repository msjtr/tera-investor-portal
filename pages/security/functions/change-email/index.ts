import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { newEmail, userId } = await req.json()
    
    // تحقق من صحة البريد
    if (!newEmail || !userId) {
      return new Response(
        JSON.stringify({ error: 'بيانات غير مكتملة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // إنشاء Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // توليد رمز OTP عشوائي (8 أرقام)
    const otp = Math.floor(10000000 + Math.random() * 90000000).toString()

    // التحقق من عدم استخدام البريد مسبقاً (في جدول auth_register)
    const { data: existingUser } = await supabase
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

    // حذف الطلبات القديمة لنفس المستخدم
    await supabase
      .from('email_change_requests')
      .delete()
      .eq('user_id', userId)

    // إدراج طلب جديد
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5) // صلاحية 5 دقائق

    const { error: insertError } = await supabase
      .from('email_change_requests')
      .insert({
        user_id: userId,
        new_email: newEmail,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        verified: false
      })

    if (insertError) throw insertError

    // إرسال البريد الإلكتروني باستخدام خدمة البريد (Resend / SMTP)
    // هذا مثال باستخدام Resend (يجب تثبيته)
    // بدلاً من ذلك، يمكنك استخدام supabase.auth.signInWithOtp مع قالب مخصص
    // لكن الأفضل استخدام خدمة بريد مستقلة لتخصيص القالب

    // هنا نستخدم signInWithOtp ولكن مع قالب مخصص "email_change"
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: newEmail,
      options: {
        shouldCreateUser: false,
        // هذا سيرسل رابط سحري، ولكننا سنستخدمه كقالب فقط
        // بدلاً من ذلك، نستخدم بيانات OTP في البريد
      }
    })

    // بدلاً من ذلك، استخدم خدمة بريد مثل Resend
    // مثال باستخدام fetch لإرسال بريد (بدون خدمات خارجية)
    // لكن للتبسيط، سنعتمد على أن Supabase سيرسل بريد تأكيد مع رابط
    // لكننا سنستخدم البريد المخصص عبر Edge Function

    // هنا نستخدم Resend كمثال:
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY) {
      const emailHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تغيير البريد الإلكتروني - تيرا</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 40px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #0d9488; font-weight: 800;">تيرا</h2>
            <h3 style="color: #1e293b;">تغيير البريد الإلكتروني</h3>
            <p style="color: #334155; line-height: 1.8;">لقد طلبت تغيير البريد الإلكتروني لحسابك. استخدم الرمز التالي لإكمال العملية:</p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0d9488;">${otp}</span>
            </div>
            <p style="color: #475569; font-size: 14px;">هذا الرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.</p>
            <p style="color: #475569; font-size: 14px;">إذا لم تطلب هذا التغيير، يرجى تجاهل هذه الرسالة.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">هذه رسالة تلقائية من منصة تيرا. يرجى عدم الرد عليها.</p>
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
          subject: 'رمز التحقق - تغيير البريد الإلكتروني',
          html: emailHtml
        })
      })

      if (!res.ok) {
        console.error('فشل إرسال البريد عبر Resend:', await res.text())
      }
    } else {
      // إذا لم يكن هناك Resend، نستخدم Supabase Auth لكن مع قالب مخصص
      // يمكنك تخصيص قالب "Email Change" في Supabase Dashboard
      // وضبط المحتوى ليشمل الـ OTP (لكن Supabase لا يدعم OTP رقمي في القوالب)
      // لذا نفضل استخدام Resend أو أي خدمة SMTP
      console.warn('⚠️ لم يتم تعيين RESEND_API_KEY، لن يتم إرسال البريد')
    }

    return new Response(
      JSON.stringify({ success: true, message: 'تم إرسال الرمز' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إرسال الرمز' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
