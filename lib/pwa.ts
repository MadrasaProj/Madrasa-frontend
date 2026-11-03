import { useEffect, useState } from "react";

export const PWA_INSTALLED_KEY = "pwa_installed";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * Checks if the current window/environment is running in standalone PWA mode,
 * fullscreen, minimal-ui, window-controls-overlay, or as an Android TWA.
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const isStandaloneDisplay =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches ||
      window.matchMedia?.("(display-mode: minimal-ui)").matches ||
      window.matchMedia?.("(display-mode: window-controls-overlay)").matches;

    const isIosStandalone = (window.navigator as Navigator & { standalone?: boolean })?.standalone === true;
    const isAndroidTwa = typeof document !== "undefined" && Boolean(document.referrer?.includes("android-app://"));
    const isUrlStandalone =
      window.location?.search?.includes("mode=standalone") ||
      window.location?.search?.includes("mode=pwa") ||
      window.location?.search?.includes("source=pwa");

    return Boolean(isStandaloneDisplay || isIosStandalone || isAndroidTwa || isUrlStandalone);
  } catch {
    return false;
  }
}

/**
 * Synchronous check to determine if the PWA is already installed:
 * 1. Runtime memory flag `window.__pwaInstalled`
 * 2. Active standalone / TWA mode
 * 3. Persisted `pwa_installed` flag in localStorage
 */
export function isPwaInstalledSync(): boolean {
  if (typeof window === "undefined") return false;

  // 1. In-memory flag
  if ((window as any).__pwaInstalled === true) {
    return true;
  }

  // 2. Currently running in standalone / installed mode
  if (isStandalone()) {
    (window as any).__pwaInstalled = true;
    try {
      window.localStorage?.setItem(PWA_INSTALLED_KEY, "true");
    } catch {
      // Ignore storage errors in private browsing
    }
    return true;
  }

  // 3. Persisted in localStorage
  try {
    if (window.localStorage?.getItem(PWA_INSTALLED_KEY) === "true") {
      (window as any).__pwaInstalled = true;
      return true;
    }
  } catch {
    // Ignore storage errors
  }

  return false;
}

/**
 * Marks the PWA as installed across memory, localStorage, and triggers global sync events.
 */
export function markPwaAsInstalled(): void {
  if (typeof window === "undefined") return;

  (window as any).__pwaInstalled = true;
  (window as any).__pwaInstallPrompt = null;

  try {
    window.localStorage?.setItem(PWA_INSTALLED_KEY, "true");
  } catch {
    // Ignore storage errors
  }

  window.dispatchEvent(new Event("pwa-installed"));
  window.dispatchEvent(new Event("pwa-prompt-consumed"));
}

/**
 * Clears the installed flag (e.g. if the user explicitly uninstalled the app and the browser offers a prompt again).
 */
export function clearPwaInstalled(): void {
  if (typeof window === "undefined") return;

  (window as any).__pwaInstalled = false;
  try {
    window.localStorage?.removeItem(PWA_INSTALLED_KEY);
  } catch {
    // Ignore storage errors
  }

  window.dispatchEvent(new Event("pwa-uninstalled"));
}

/**
 * Asynchronously queries the browser's getInstalledRelatedApps API (Chromium 84+).
 * If the related web application is installed on the user's OS/device, marks as installed.
 */
export async function checkPwaInstalledAsync(): Promise<boolean> {
  if (isPwaInstalledSync()) return true;

  if (typeof navigator !== "undefined" && "getInstalledRelatedApps" in navigator) {
    try {
      const getRelatedApps = (navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string; id?: string }>>;
      }).getInstalledRelatedApps;

      if (typeof getRelatedApps === "function") {
        const relatedApps = await getRelatedApps.call(navigator);
        if (Array.isArray(relatedApps) && relatedApps.length > 0) {
          markPwaAsInstalled();
          return true;
        }
      }
    } catch {
      // Ignored if API is unavailable or restricted
    }
  }

  return false;
}

/**
 * React hook to manage and observe PWA install state reactively.
 * Ensures that if the PWA is installed, NO install UI is ever presented.
 */
export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isPwaInstalledSync());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (isPwaInstalledSync()) return null;
    return ((window as any)?.__pwaInstallPrompt as BeforeInstallPromptEvent) || null;
  });

  const isIos =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(typeof window !== "undefined" && (window as any).MSStream);

  useEffect(() => {
    // If already detected as installed, ensure state is set and stop prompt
    if (isPwaInstalledSync()) {
      setIsInstalled(true);
      setInstallPrompt(null);
      return;
    }

    // Perform async verification via getInstalledRelatedApps
    void checkPwaInstalledAsync().then((installed) => {
      if (installed) {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    });

    const syncInstalledState = () => {
      const installed = isPwaInstalledSync();
      setIsInstalled(installed);
      if (installed) {
        setInstallPrompt(null);
      }
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const handlePrompt = (event?: Event) => {
      if (isPwaInstalledSync()) {
        if (event) event.preventDefault();
        setInstallPrompt(null);
        return;
      }

      if (event && event.type === "beforeinstallprompt") {
        event.preventDefault();
        (window as any).__pwaInstallPrompt = event;
        setInstallPrompt(event as BeforeInstallPromptEvent);
      } else {
        const globalPrompt = (window as any)?.__pwaInstallPrompt as BeforeInstallPromptEvent | null;
        if (globalPrompt) {
          setInstallPrompt(globalPrompt);
        }
      }
    };

    const handlePromptConsumed = () => {
      setInstallPrompt(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PWA_INSTALLED_KEY) {
        if (e.newValue === "true") {
          setIsInstalled(true);
          setInstallPrompt(null);
        } else {
          setIsInstalled(isStandalone());
        }
      }
    };

    // Initial prompt sync
    const currentPrompt = (window as any)?.__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (currentPrompt && !isPwaInstalledSync()) {
      setInstallPrompt(currentPrompt);
    }

    window.addEventListener("pwa-installed", handleInstalled);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("pwa-prompt-available", handlePrompt);
    window.addEventListener("pwa-prompt-consumed", handlePromptConsumed);
    window.addEventListener("storage", handleStorageChange);

    const mqlStandalone = window.matchMedia?.("(display-mode: standalone)");
    const mqlFullscreen = window.matchMedia?.("(display-mode: fullscreen)");
    mqlStandalone?.addEventListener("change", syncInstalledState);
    mqlFullscreen?.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener("pwa-installed", handleInstalled);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("pwa-prompt-available", handlePrompt);
      window.removeEventListener("pwa-prompt-consumed", handlePromptConsumed);
      window.removeEventListener("storage", handleStorageChange);
      mqlStandalone?.removeEventListener("change", syncInstalledState);
      mqlFullscreen?.removeEventListener("change", syncInstalledState);
    };
  }, []);

  const promptToInstall = async (): Promise<boolean> => {
    const prompt = installPrompt || ((window as any)?.__pwaInstallPrompt as BeforeInstallPromptEvent | null);
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      (window as any).__pwaInstallPrompt = null;
      setInstallPrompt(null);
      window.dispatchEvent(new Event("pwa-prompt-consumed"));

      if (choice?.outcome === "accepted") {
        markPwaAsInstalled();
        setIsInstalled(true);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("PWA prompt error:", err);
      return false;
    }
  };

  return {
    isInstalled,
    installPrompt,
    isIos,
    promptToInstall,
  };
}
