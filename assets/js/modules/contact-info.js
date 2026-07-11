/**
 * modules/contact-info.js – جلب معلومات الملف الشخصي من قاعدة البيانات
 */
(function() {
    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    async function getFullProfile(userId) {
        const sb = await getSupabase();
        if (!sb) return null;
        try {
            const [
                { data: personalInfo },
                { data: contactInfo },
                { data: bankInfo },
                { data: nationalAddress },
                { data: attachments },
                { data: profile }
            ] = await Promise.all([
                sb.from('user_personal_info').select('*').eq('user_id', userId).maybeSingle(),
                sb.from('user_contact_info').select('*').eq('user_id', userId).maybeSingle(),
                sb.from('user_bank_info').select('*').eq('user_id', userId).maybeSingle(),
                sb.from('user_national_address').select('*').eq('user_id', userId).maybeSingle(),
                sb.from('user_attachments').select('*').eq('user_id', userId).maybeSingle(),
                sb.from('profiles').select('*').eq('user_id', userId).maybeSingle()
            ]);
            return { personalInfo, contactInfo, bankInfo, nationalAddress, attachments, profile };
        } catch (error) {
            console.error('❌ فشل جلب الملف الشخصي:', error);
            return null;
        }
    }

    async function getContactInfo(userId) {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data } = await sb.from('user_contact_info').select('*').eq('user_id', userId).maybeSingle();
        return data;
    }

    async function getPersonalInfo(userId) {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data } = await sb.from('user_personal_info').select('*').eq('user_id', userId).maybeSingle();
        return data;
    }

    async function getBankInfo(userId) {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data } = await sb.from('user_bank_info').select('*').eq('user_id', userId).maybeSingle();
        return data;
    }

    async function getNationalAddress(userId) {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data } = await sb.from('user_national_address').select('*').eq('user_id', userId).maybeSingle();
        return data;
    }

    function checkProfileCompletion(profileData) {
        const missing = [];
        if (!profileData.personalInfo || !profileData.personalInfo.full_name) missing.push('المعلومات الشخصية');
        if (!profileData.contactInfo || !profileData.contactInfo.email) missing.push('معلومات الاتصال');
        if (!profileData.nationalAddress || !profileData.nationalAddress.address) missing.push('العنوان الوطني');
        if (!profileData.bankInfo || !profileData.bankInfo.bank_name) missing.push('المعلومات البنكية');
        if (!profileData.attachments || !profileData.attachments.id_card) missing.push('المرفقات');

        return { completed: missing.length === 0, missing };
    }

    window.ContactInfo = { getFullProfile, getContactInfo, getPersonalInfo, getBankInfo, getNationalAddress, checkProfileCompletion };
})();
