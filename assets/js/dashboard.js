// دالة لتحديث حالة استكمال معلومات الاتصال في verification_requests
async function updateVerificationStatus() {
    try {
        // التأكد من وجود سجل طلب تحقق للمستخدم
        const { data: existing } = await supabase
            .from('verification_requests')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        const record = {
            user_id: currentUser.id,
            contact_info_completed: true,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            // تحديث السجل الموجود
            await supabase
                .from('verification_requests')
                .update(record)
                .eq('id', existing.id);
        } else {
            // إنشاء سجل جديد مع إضافة الحقول الأساسية
            record.id = crypto.randomUUID(); // أو يمكن توليده تلقائياً
            await supabase.from('verification_requests').insert(record);
        }
    } catch (e) {
        console.warn('تعذر تحديث حالة التحقق:', e);
    }
}
