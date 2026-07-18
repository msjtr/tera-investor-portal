window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {

    await OneSignal.init({
        appId: "512d9b65-ec50-41a5-ac12-059a83441a72",
        notifyButton: {
            enable: false
        }
    });

});
