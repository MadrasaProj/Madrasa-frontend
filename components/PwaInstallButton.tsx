import { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  Sparkles,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { lang } = useLanguageStore();

  useEffect(() => {
    const syncPrompt = () => {
      const p =
        globalDeferredPrompt ||
        ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent) ||
        null;
      if (p) setDeferredPrompt(p);
      setIsInstalled(checkIsInstalled());
    };

    syncPrompt();

    const onPromptAvailable = () => syncPrompt();
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("pwa-prompt-available", onPromptAvailable);
    window.addEventListener("beforeinstallprompt", onPromptAvailable);
    window.addEventListener("pwa-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-available", onPromptAvailable);
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
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          (window as any).__pwaInstalled = true;
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("PWA prompt error, showing manual guide:", err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // If already running in standalone PWA mode, don't show prompt
  if (isInstalled) return null;

  return (
    <>
      {variant === "card" && (
        <div
          className={cn(
            "bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/25 rounded-2xl p-3 shadow-xs",
            className,
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 truncate">
                  Smart Madrasa
                </span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-600 text-white rounded-md tracking-wider">
                  App
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight truncate">
                {lang === "ml"
                  ? "വേഗത്തിൽ ഉപയോഗിക്കാൻ"
                  : "Quick access & alerts"}
              </p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="mt-2.5 w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 text-xs group"
          >
            <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            <span>
              {lang === "ml" ? "ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക" : "Install App"}
            </span>
          </button>
        </div>
      )}

      {variant === "banner" && (
        <div
          className={cn(
            "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs",
            className,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "ml"
                    ? "സ്മാർട്ട് മദ്റസ ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക"
                    : "Install Smart Madrasa App"}
                </h4>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Fast & Easy
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {lang === "ml"
                  ? "നിങ്ങളുടെ ഫോണിലേക്ക് നേരിട്ട് ഇൻസ്റ്റാൾ ചെയ്ത് തത്സമയ അറിയിപ്പുകൾ നേടുക"
                  : "Install directly on your home screen for quick daily access & instant notifications"}
              </p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 group self-start sm:self-auto"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            <span>{lang === "ml" ? "ഇൻസ്റ്റാൾ ചെയ്യുക" : "Install App"}</span>
          </button>
        </div>
      )}

      {variant === "button" && (
        <button
          onClick={handleInstall}
          className={cn(
            "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-xs",
            className,
          )}
        >
          <Download className="w-4 h-4" />
          <span>
            {lang === "ml" ? "ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക" : "Install App"}
          </span>
        </button>
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
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {lang === "ml"
                      ? "ആപ്പ് എങ്ങനെ ഇൻസ്റ്റാൾ ചെയ്യാം"
                      : "How to Install App"}
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
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
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
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
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            താഴേക്ക് സ്ക്രോൾ ചെയ്ത്{" "}
                            <strong>&apos;Add to Home Screen&apos;</strong> (
                            <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" />
                            ) തിരഞ്ഞെടുക്കുക.
                          </>
                        ) : (
                          <>
                            Scroll down and select{" "}
                            <strong>&apos;Add to Home Screen&apos;</strong> (
                            <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" />
                            ).
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            മുകളിൽ വലതുവശത്തുള്ള <strong>&apos;Add&apos;</strong>{" "}
                            അമർത്തുക.
                          </>
                        ) : (
                          <>
                            Tap <strong>&apos;Add&apos;</strong> in the top right
                            corner.
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
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
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
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <p className="flex-1 leading-relaxed">
                        {lang === "ml" ? (
                          <>
                            <strong>&apos;Install app&apos;</strong> അല്ലെങ്കിൽ{" "}
                            <strong>&apos;Add to Home screen&apos;</strong> (
                            <Download className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" />
                            ) തിരഞ്ഞെടുക്കുക.
                          </>
                        ) : (
                          <>
                            Select <strong>&apos;Install app&apos;</strong> or{" "}
                            <strong>&apos;Add to Home screen&apos;</strong> (
                            <Download className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" />
                            ).
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                {lang === "ml" ? "മനസ്സിലായി" : "Got It"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
