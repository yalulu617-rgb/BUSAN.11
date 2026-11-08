(function (root) {
    'use strict';

    let deferredPrompt = null;
    let dismissed = false;
    let installed = false;
    const subscribers = new Set();

    function isStandalone() {
        return Boolean(
            (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) ||
            root.navigator.standalone === true
        );
    }

    function isIos() {
        const ua = root.navigator.userAgent || '';
        const platform = root.navigator.platform || '';
        const touchMac = platform === 'MacIntel' && root.navigator.maxTouchPoints > 1;
        return /iPad|iPhone|iPod/.test(ua) || touchMac;
    }

    function getState() {
        const standalone = isStandalone();
        const complete = installed || standalone;
        return Object.freeze({
            standalone,
            installed: complete,
            ios: isIos(),
            canPrompt: !complete && !dismissed && Boolean(deferredPrompt),
            showIosHelp: !complete && !dismissed && isIos()
        });
    }

    function publish() {
        const state = getState();
        subscribers.forEach(listener => listener(state));
        root.dispatchEvent(new CustomEvent('pwa-install-state-change', { detail: state }));
    }

    function capturePrompt(event) {
        if (installed || isStandalone() || dismissed) return;
        event.preventDefault();
        deferredPrompt = event;
        publish();
    }

    async function promptInstall() {
        if (!deferredPrompt || installed || isStandalone() || dismissed) {
            return { outcome: 'unavailable', platform: '' };
        }

        const promptEvent = deferredPrompt;
        deferredPrompt = null;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') installed = true;
        else dismissed = true;
        publish();
        return choice;
    }

    function dismiss() {
        dismissed = true;
        deferredPrompt = null;
        publish();
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') return function () {};
        subscribers.add(listener);
        listener(getState());
        return function () { subscribers.delete(listener); };
    }

    root.addEventListener('beforeinstallprompt', capturePrompt);
    root.addEventListener('appinstalled', function () {
        installed = true;
        deferredPrompt = null;
        publish();
    });

    const displayMode = root.matchMedia && root.matchMedia('(display-mode: standalone)');
    if (displayMode && typeof displayMode.addEventListener === 'function') {
        displayMode.addEventListener('change', publish);
    }

    root.PwaInstallEngine = Object.freeze({
        getState,
        promptInstall,
        dismiss,
        subscribe
    });
})(window);
