const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// ==================================================
// ✅ 1. تسجيل جميع الطلبات (للتشخيص)
// ==================================================
app.use((req, res, next) => {
    console.log(`📩 ${req.method} ${req.url}`);
    next();
});

// ==================================================
// ✅ 2. مسار مخصص لصفحة الإشعارات (كحل بديل)
// ==================================================
app.get('/pages/support/notifications.html', (req, res) => {
    const filePath = path.join(__dirname, 'pages', 'support', 'notifications.html');
    console.log(`🔍 محاولة إرسال الملف: ${filePath}`);
    
    // التحقق من وجود الملف قبل إرساله
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error(`❌ الملف غير موجود: ${filePath}`);
        res.status(404).send(`الملف غير موجود: pages/support/notifications.html`);
    }
});

// ==================================================
// ✅ 3. خدمة الملفات الثابتة (مع مجلدات إضافية)
// ==================================================
// تأكد من أن المسار المطلق يعمل بشكل صحيح
const staticPath = path.join(__dirname);
console.log(`📁 تقديم الملفات من: ${staticPath}`);
app.use(express.static(staticPath));

// في حال وجود مجلدات أخرى مثل `assets` و `pages`
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// ==================================================
// ✅ 4. مسار وكيل LocationIQ (كما هو)
// ==================================================
app.get('/api/location/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and Longitude are required' });
        }

        const apiKey = process.env.LOCATIONIQ_API_KEY || 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';
        const baseUrl = 'https://us1.locationiq.com';
        const endpoint = '/v1/reverse';

        const params = new URLSearchParams({
            key: apiKey,
            lat: lat,
            lon: lon,
            format: 'json',
            addressdetails: '1',
            normalizeaddress: '1',
            normalizecity: '1',
            postaladdress: '1',
            matchquality: '1',
            statecode: '1',
            namedetails: '1',
            extratags: '1',
            'accept-language': 'native'
        });

        const url = `${baseUrl}${endpoint}?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `LocationIQ returned ${response.status}`,
                lookup_status: 0
            });
        }

        const data = await response.json();
        res.json({ ...data, lookup_status: 1 });

    } catch (error) {
        console.error('❌ Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error', lookup_status: 0 });
    }
});

// ==================================================
// ✅ 5. مسار افتراضي (في حال عدم العثور على أي شيء)
// ==================================================
app.use((req, res) => {
    console.log(`❌ 404 Not Found: ${req.url}`);
    res.status(404).send('الصفحة غير موجودة');
});

// ==================================================
// ✅ 6. بدء الخادم
// ==================================================
app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📁 الملفات الثابتة تخدم من: ${__dirname}`);
});
