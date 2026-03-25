import { useEffect, useState } from "react";

export function useServiceWorkerUpdater() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    let refreshing = false;
    let registrationRef: ServiceWorkerRegistration | null = null;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      registrationRef = registration;

      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const candidate = registration.installing;
        if (!candidate) return;

        candidate.addEventListener("statechange", () => {
          if (
            candidate.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(registration.waiting ?? candidate);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      void registrationRef?.update();
    };
  }, []);

  function updateApp() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  return { waitingWorker, updateApp };
}
