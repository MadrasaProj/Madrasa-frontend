import { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  X,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global window prompt reference
let globalDeferredPrompt: BeforeInstallPromptEvent | null =
  typeof window !== "undefined"
    ? ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent) || null
    : null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    (window as any).__pwaInstallPrompt = e;
    window.dispatchEvent(new Event("pwa-prompt-available"));
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    (window as any).__pwaInstallPrompt = null;
    (window as any).__pwaInstalled = true;
    window.dispatchEvent(new Event("pwa-installed"));
  });
}

const checkIsInstalled = (): boolean => {
  if (typeof window === "undefined") return false;
  if ((window as any).__pwaInstalled) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
};

export interface PwaInstallButtonProps {
  variant?: "card" | "banner" | "button";
  className?: string;
}

export default function PwaInstallButton({
  variant = "card",
  className,
}: PwaInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    checkIsInstalled(),
  );
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { lang } = useLanguageStore();

  useEffect(() => {
    const syncPrompt = () => {
      const p =
        globalDeferredPrompt ||
        ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent) ||
        null;
      setDeferredPrompt(p);
      setIsInstalled(checkIsInstalled());
    };

    syncPrompt();

    const onPromptAvailable = () => syncPrompt();
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("pwa-prompt-available", onPromptAvailable);
    window.addEventListener("pwa-prompt-consumed", onPromptAvailable);
    window.addEventListener("beforeinstallprompt", onPromptAvailable);
    window.addEventListener("pwa-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-available", onPromptAvailable);
      window.removeEventListener("pwa-prompt-consumed", onPromptAvailable);
      window.removeEventListener("beforeinstallprompt", onPromptAvailable);
      window.removeEventListener("pwa-installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isIos =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowGuideModal(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      globalDeferredPrompt = null;
      (window as any).__pwaInstallPrompt = null;
      setDeferredPrompt(null);
      window.dispatchEvent(new Event("pwa-prompt-consumed"));
      setDismissed(true);
    } catch (err) {
      console.warn("PWA prompt error, showing manual guide:", err);
      setShowGuideModal(true);
    }
  };

  // If already running in standalone PWA mode, don't show prompt
  if (isInstalled || dismissed) return null;

  return (
    <>
      {(variant === "card" || variant === "banner") && (
        <div
          className={cn(
            "relative isolate overflow-hidden rounded-2xl border border-primary-200 bg-linear-to-br from-primary-600 via-primary-600 to-primary-800 p-4 text-white shadow-xs sm:p-5",
            className,
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-8 size-36 rounded-full border border-white/15 sm:size-44"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -bottom-14 size-52 rounded-full border border-white/10 sm:size-60"
          />
          <img
            src="/icons/icon.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-2 bottom-0 h-24 w-auto rotate-[-12deg] opacity-25 brightness-0 invert sm:right-6 sm:h-32"
          />
          <div className="relative max-w-[75%]">
            <h2 className="text-sm font-bold leading-tight sm:text-base">
              {lang === "ml"
                ? "സ്മാർട്ട് മദ്റസ ഇൻസ്റ്റാൾ ചെയ്യൂ"
                : "Install Smart Madrasa"}
            </h2>
            <p className="mt-1 text-xs leading-snug text-white/90">
              {lang === "ml"
                ? "വേഗത്തിൽ തുറക്കാനും അറിയിപ്പുകൾ ലഭിക്കാനും ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യൂ."
                : "Get quick access and updates right from your home screen."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              className="mt-3 bg-white font-bold text-primary-800 hover:bg-primary-50"
            >
               {lang === "ml" ? "ഇൻസ്റ്റാൾ ചെയ്യൂ" : "Install App"}
            </Button>
          </div>
        </div>
      )}

      {variant === "button" && (
        <Button
          size="lg"
          onClick={handleInstall}
          className={cn(
            "w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-xs",
            className,
          )}
        >
          <Download className="w-4 h-4" />
          <span>
            {lang === "ml" ? "ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക" : "Install App"}
          </span>
        </Button>
      )}

      {/* Guide modal for iOS and browsers without native prompt */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 relative space-y-4"
            >
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 px-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {lang === "ml"
                      ? "ആപ്പ് എങ്ങനെ ഇൻസ്റ്റാൾ ചെയ്യാം"
                      : "How to Install App"}
                  </h3>
                  <p className="text-xs text-primary-700 font-medium">
                    Smart Madrasa
                  </p>
                </div>
              </div>

              {isIos ? (
                <div className="space-y-3 pt-1 text-xs text-gray-700">
                  <p className="text-gray-500 font-medium">
                    {lang === "ml"
                      ? "നിങ്ങളുടെ iPhone / iPad-ൽ താഴെ പറയുന്നവ ചെയ്യുക:"
                      : "Follow these 3 easy steps in Safari:"}
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            Safari-യിലെ <strong>Share</strong> (
                            <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />
                            ) ബട്ടൺ അമർത്തുക.
                          </>
                        ) : (
                          <>
                            Tap the <strong>Share</strong> button (
                            <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />
                            ) in Safari.
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            താഴേക്ക് സ്ക്രോൾ ചെയ്ത്{" "}
                            <strong>&apos;Add to Home Screen&apos;</strong> (
                            <PlusSquare className="w-3.5 h-3.5 inline text-primary-600 mx-0.5" />
                            ) തിരഞ്ഞെടുക്കുക.
                          </>
                        ) : (
                          <>
                            Scroll down and select{" "}
                            <strong>&apos;Add to Home Screen&apos;</strong> (
                            <PlusSquare className="w-3.5 h-3.5 inline text-primary-600 mx-0.5" />
                            ).
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            മുകളിൽ വലതുവശത്തുള്ള{" "}
                            <strong>&apos;Add&apos;</strong> അമർത്തുക.
                          </>
                        ) : (
                          <>
                            Tap <strong>&apos;Add&apos;</strong> in the top
                            right corner.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1 text-xs text-gray-700">
                  <p className="text-gray-500 font-medium">
                    {lang === "ml"
                      ? "ബ്രൗസറിൽ നിന്ന് ഇൻസ്റ്റാൾ ചെയ്യുക:"
                      : "Install directly from your browser:"}
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            ബ്രൗസറിന്റെ മുകളിൽ വലതുവശത്തുള്ള മെനു (
                            <MoreVertical className="w-3.5 h-3.5 inline text-gray-600 mx-0.5" />
                            ) അമർത്തുക.
                          </>
                        ) : (
                          <>
                            Tap the browser menu (
                            <MoreVertical className="w-3.5 h-3.5 inline text-gray-600 mx-0.5" />
                            ) at the top right.
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            <strong>&apos;Install app&apos;</strong> അല്ലെങ്കിൽ{" "}
                            <strong>&apos;Add to Home screen&apos;</strong> (
                            <Download className="w-3.5 h-3.5 inline text-primary-600 mx-0.5" />
                            ) തിരഞ്ഞെടുക്കുക.
                          </>
                        ) : (
                          <>
                            Select <strong>&apos;Install app&apos;</strong> or{" "}
                            <strong>&apos;Add to Home screen&apos;</strong> (
                            <Download className="w-3.5 h-3.5 inline text-primary-600 mx-0.5" />
                            ).
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                {lang === "ml" ? "മനസ്സിലായി" : "Got It"}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
