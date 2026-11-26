import { isMobileAppWrapper, isStandalone } from "./pwa";

/**
 * Initializes global adjustments for mobile app wrappers (WebView, Capacitor, React Native, Cordova, Flutter)
 * - Prevents accidental pinch-to-zoom and multi-touch zoom on non-zoomable elements
 * - Prevents gesture zoom quirks on iOS WebViews
 * - Normalizes keyboard dismiss viewport shifts
 * - Tags document element with mobile wrapper state
 * - Exposes safe bridge interface for wrapper back button and navigation
 */
export function initMobileWrapper(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const isWrapper = isMobileAppWrapper() || isStandalone();
  if (isWrapper) {
    document.documentElement.dataset.mobileApp = "true";
    document.documentElement.classList.add("is-mobile-app");
  }

  // Helper to determine if the user is in a mobile/touch environment
  const isMobileEnvironment = (): boolean => {
    return (
      window.innerWidth <= 1024 ||
      isMobileAppWrapper() ||
      (isStandalone() && window.innerWidth <= 1024) ||
      window.matchMedia("(pointer: coarse)").matches
    );
  };

  // Helper to check if touch event originated inside an element that explicitly permits zooming
  const isZoomableTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        '[data-allow-zoom="true"], .cropper-container, .react-cropper, canvas, [data-zoomable]'
      )
    );
  };

  // 1. Block iOS Safari / WKWebView gesture zoom (pinch gestures) on mobile devices
  const preventGestureZoom = (e: Event) => {
    if (isMobileEnvironment() && !isZoomableTarget(e.target)) {
      e.preventDefault();
    }
  };

  document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
  document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
  document.addEventListener("gestureend", preventGestureZoom, { passive: false });

  // 2. Prevent multi-finger pinch gestures on touchstart when in mobile/touch environment
  document.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (
        isMobileEnvironment() &&
        e.touches &&
        e.touches.length > 1 &&
        !isZoomableTarget(e.target)
      ) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 3. Fix iOS Safari/WebView scroll offset artifact when virtual keyboard closes
  document.addEventListener("focusout", (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      // Slight delay to allow viewport to settle after soft keyboard closes
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: window.scrollY,
          left: window.scrollX,
          behavior: "instant" as ScrollBehavior,
        });
      });
    }
  });

  // 4. Expose bridge object for native mobile wrappers (e.g. Flutter/React Native/Capacitor)
  (window as any).__MOBILE_BRIDGE__ = {
    isWrapper: () => isMobileAppWrapper() || isStandalone(),
    goBack: () => {
      if (window.history.length > 1) {
        window.history.back();
        return true;
      }
      return false;
    },
    handleHardwareBack: () => {
      // First check if any open dialog, sheet, or drawer escape trigger exists
      const openDialogCloseBtn = document.querySelector<HTMLElement>(
        '[role="dialog"][data-state="open"] button[data-dialog-close], [role="dialog"][data-state="open"] .close-btn'
      );
      if (openDialogCloseBtn) {
        openDialogCloseBtn.click();
        return true;
      }

      if (window.history.length > 1) {
        window.history.back();
        return true;
      }
      return false;
    },
  };

  // Listen for hardware back press dispatched by native webview wrappers
  window.addEventListener("hardwareBackPress", () => {
    (window as any).__MOBILE_BRIDGE__?.handleHardwareBack();
  });
}
