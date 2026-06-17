function updateRuleMarker(elementId, isValid) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    // البحث عن عنصر العلامة الداخلي لتحديثه بدقة بدلاً من إعادة كتابة النص كلياً
    const marker = el.querySelector('.icon-marker');
    
    if (isValid) {
        el.className = "valid";
        if (marker) marker.innerHTML = "✅";
    } else {
        el.className = "invalid";
        if (marker) marker.innerHTML = "❌";
    }
}
