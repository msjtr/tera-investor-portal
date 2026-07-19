window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
        appId: "512d9b65-ec50-41a5-ac12-059a83441a72",
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: {
            enable: false
        }
    });

    console.log("✅ OneSignal Initialized");

    const permission = await OneSignal.Notifications.permission;
    console.log("Notification Permission:", permission);

    const subscribed = await OneSignal.User.PushSubscription.optedIn;
    console.log("Push Subscribed:", subscribed);
});
