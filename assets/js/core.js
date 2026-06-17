/* ================================================= */
/* DYNAMIC COMPONENT LOADER (نسخة المسارات النسبية) */
/* ================================================= */
async function loadComponents() {
    // نستخدم مسارات تبدأ بـ ../.. للخروج من المجلدات الفرعية والوصول لمجلد المكونات
    // إذا كنت في المجلد الرئيسي، سيتم ضبط المسار تلقائياً
    const components = [
        { selector: '#header-container', path: '../../components/header.html' },
        { selector: '#footer-container', path: '../../components/footer.html' },
        { selector: '#sidebar-container', path: '../../components/sidebar.html' },
        { selector: '#loader-container', path: '../../components/loader.html' }
    ];

    for (const comp of components) {
        const element = document.querySelector(comp.selector);
        if (element) {
            try {
                const res = await fetch(comp.path);
                if (res.ok) {
                    element.innerHTML = await res.text();
                } else {
                    console.warn(`Failed to load: ${comp.path} - Status: ${res.status}`);
                }
            } catch (err) {
                console.warn(`Error loading ${comp.path}`, err);
            }
        }
    }
    
    // إخفاء اللودر فور انتهاء عملية التحميل مهما كانت النتيجة
    hideLoader();
}
