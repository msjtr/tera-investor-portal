/**
 * OneSignal Updater Service Worker
 * ملف مطابق لـ OneSignalSDKWorker.js كما توصي به وثائق OneSignal الرسمية.
 * مطلوب لتفادي فشل صامت (404) عند تسجيل service worker عبر serviceWorkerUpdaterPath.
 */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
