/**
 * OneSignal Updater Service Worker – الإصدار الآمن والمستقر
 * ✅ ملف كان مفقوداً تماماً من المشروع رغم أن onesignal-init.js يشير إليه
 * عبر serviceWorkerUpdaterPath، مما كان يسبب فشلاً صامتاً (404) عند
 * محاولة OneSignal تسجيل هذا الـ Service Worker.
 * المحتوى مطابق لـ OneSignalSDKWorker.js كما توصي به وثائق OneSignal الرسمية.
 */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
