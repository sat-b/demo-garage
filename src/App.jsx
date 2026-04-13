import React, { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import GarageCom from "./GarageCom_3_8.jsx";

export default function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    immediate: true
  });

  const [installEvent, setInstallEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    setIsStandalone(checkStandalone());

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const handleInstalled = () => {
      setIsStandalone(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const showInstall = useMemo(() => installEvent && !isStandalone, [installEvent, isStandalone]);

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const installApp = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try {
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setInstallEvent(null);
      }
    } catch (err) {
      setInstallEvent(null);
    }
  };

  return (
    <>
      <GarageCom />

      {(offlineReady || needRefresh || showInstall) && (
        <div className="pwa-toast" role="status" aria-live="polite">
          {needRefresh && (
            <div className="pwa-toast__section">
              <div className="pwa-toast__text">
                <div className="pwa-toast__title">Update available</div>
                <div className="pwa-toast__body">A new version is ready. Refresh to update.</div>
              </div>
              <div className="pwa-toast__actions">
                <button className="pwa-btn pwa-btn--primary" onClick={() => updateServiceWorker(true)}>
                  Refresh
                </button>
                <button className="pwa-btn" onClick={dismiss}>
                  Later
                </button>
              </div>
            </div>
          )}

          {offlineReady && (
            <div className="pwa-toast__section">
              <div className="pwa-toast__text">
                <div className="pwa-toast__title">Offline ready</div>
                <div className="pwa-toast__body">The app is cached and works offline.</div>
              </div>
              <div className="pwa-toast__actions">
                <button className="pwa-btn" onClick={dismiss}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {showInstall && (
            <div className="pwa-toast__section">
              <div className="pwa-toast__text">
                <div className="pwa-toast__title">Install the app</div>
                <div className="pwa-toast__body">Add Garage to your home screen for the best experience.</div>
              </div>
              <div className="pwa-toast__actions">
                <button className="pwa-btn pwa-btn--primary" onClick={installApp}>
                  Install
                </button>
                <button className="pwa-btn" onClick={() => setInstallEvent(null)}>
                  Not now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
