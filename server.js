const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// خدمة الملفات الثابتة (كل مجلدات المشروع)
app.use(express.static(path.join(__dirname)));

// ==================================================
// مسار وكيل LocationIQ – يحمي المفتاح
// ==================================================
app.get('/api/location/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and Longitude are required' });
        }

        // المفتاح من متغيرات بيئة Render (أو احتياطي للتطوير)
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
        const response = await fetch(url);   // Node 18+ يدعم fetch

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

// بدء الخادم
app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
