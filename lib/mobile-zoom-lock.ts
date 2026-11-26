/**
 * Global Mobile Native Experience Controller
 * Enforces true native app feel across iOS Safari, Android Chrome, PWAs, and native WebViews:
 * - Prevents multi-touch pinch-to-zoom on iOS Safari (which ignores user-scalable=no)
 * - Prevents double-tap-to-zoom on non-interactive UI
 * - Leaves single-finger touch scrolling completely untouched (full 60/120fps velocity)
 * - Automatically normalizes iOS viewport offset when the soft keyboard dismisses
 * - Exposes hardware back button and bridge for native app wrappers (Capacitor/React Native/Flutter)
 */

export function initMobileNativeExperience(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const isCoarsePointer = () =>
    window.matchMedia("(pointer: coarse)").matches ||
    window.innerWidth <= 1024 ||
    Boolean(
      (window as any).ReactNativeWebView ||
      (window as any).Capacitor ||
      (window as any).cordova ||
      (window as any).flutter_inappwebview
    );

  const isZoomAllowed = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        '[data-allow-zoom="true"], .cropper-container, .react-cropper, canvas, [data-zoomable]'
      )
    );
  };

  // 1. Block iOS Safari / WebKit multi-finger gesture zoom (pinch/spread/rotate)
  // WebKit gesture events ONLY fire for multi-finger touch gestures, never for single-finger scrolling!
  const blockGesture = (e: Event) => {
    if (isCoarsePointer() && !isZoomAllowed(e.target)) {
      e.preventDefault();
    }
  };

  document.addEventListener("gesturestart", blockGesture, { passive: false });
  document.addEventListener("gesturechange", blockGesture, { passive: false });
  document.addEventListener("gestureend", blockGesture, { passive: false });

  // 2. Prevent multi-finger touchstart (pinch zoom attempt)
  // Single finger scrolling (e.touches.length === 1) is completely unaffected!
  document.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (isCoarsePointer() && e.touches && e.touches.length > 1 && !isZoomAllowed(e.target)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 3. Prevent double-tap-to-zoom on mobile UI chrome
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e: TouchEvent) => {
      if (!isCoarsePointer()) return;
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null;
        const isInputField =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable);

        if (!isInputField && !isZoomAllowed(target)) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // 4. Smooth viewport normalization on iOS Safari when keyboard closes
  document.addEventListener("focusout", (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: window.scrollY,
          left: window.scrollX,
          behavior: "instant" as ScrollBehavior,
        });
      });
    }
  });

  // 5. Expose bridge for native mobile app wrappers
  (window as any).__MOBILE_BRIDGE__ = {
    isWrapper: () =>
      Boolean(
        (window as any).ReactNativeWebView ||
        (window as any).Capacitor ||
        (window as any).cordova ||
        (window as any).flutter_inappwebview
      ),
    handleHardwareBack: () => {
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

  window.addEventListener("hardwareBackPress", () => {
    (window as any).__MOBILE_BRIDGE__?.handleHardwareBack();
  });
}
