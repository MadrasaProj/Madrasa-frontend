import { useState } from "react";
import {
  Download,
  Smartphone,
  Laptop,
  Share,
  PlusSquare,
  MoreVertical,
  X,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/pwa";

export interface PwaInstallButtonProps {
  variant?: "card" | "banner" | "button" | "compact" | "pill";
  className?: string;
}

export default function PwaInstallButton({
  variant = "card",
  className,
}: PwaInstallButtonProps) {
  const { isInstalled, installPrompt, isIos, promptToInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { lang } = useLanguageStore();

  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia?.("(min-width: 1025px) and (pointer: fine)").matches;

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        const success = await promptToInstall();
        if (success) {
          setDismissed(true);
          return;
        }
      } catch (err) {
        console.warn("PWA prompt error, showing manual guide:", err);
      }
    }
    setShowGuideModal(true);
  };

  // If already installed/standalone or dismissed, do not show
  if (isInstalled || dismissed) {
    return null;
  }

  // Large home-screen cards and banners are mobile UI patterns; never render on desktop
  if ((variant === "card" || variant === "banner") && isDesktop) {
    return null;
  }

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

      {variant === "compact" && (
        <button
          type="button"
          onClick={handleInstall}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs active:scale-[0.98]",
            className,
          )}
        >
          <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>{lang === "ml" ? "ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യൂ" : "Install App"}</span>
        </button>
      )}

      {variant === "pill" && (
        <button
          type="button"
          onClick={handleInstall}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs shrink-0 active:scale-95",
            className,
          )}
          title="Install Smart Madrasa app"
        >
          <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>{lang === "ml" ? "ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യൂ" : "Install App"}</span>
        </button>
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

      {/* Guide modal for browsers or devices requiring manual step */}
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
                  {isDesktop ? (
                    <Laptop className="w-6 h-6" />
                  ) : (
                    <Smartphone className="w-6 h-6" />
                  )}
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
              ) : isDesktop ? (
                <div className="space-y-3 pt-1 text-xs text-gray-700">
                  <p className="text-gray-500 font-medium">
                    {lang === "ml"
                      ? "ഡെസ്ക്ടോപ്പ് ബ്രൗസറിൽ നിന്ന് നേരിട്ട് ഇൻസ്റ്റാൾ ചെയ്യുക:"
                      : "Direct install in Chrome or Edge:"}
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <p className="flex-1 leading-relaxed text-gray-800">
                        {lang === "ml" ? (
                          <>
                            ബ്രൗസറിന്റെ അഡ്രസ്സ് ബാറിന്റെ (URL bar) വലതുവശത്തുള്ള{" "}
                            <strong>ഇൻസ്റ്റാൾ ഐക്കൺ</strong> (
                            <Download className="w-3.5 h-3.5 inline text-emerald-700 mx-0.5" />
                            ) ക്ലിക്ക് ചെയ്യുക.
                          </>
                        ) : (
                          <>
                            Click the <strong>Install</strong> icon (
                            <Download className="w-3.5 h-3.5 inline text-emerald-700 mx-0.5" />
                            ) on the right side of the address bar.
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
                            അല്ലെങ്കിൽ മെനു (
                            <MoreVertical className="w-3.5 h-3.5 inline text-gray-600 mx-0.5" />
                            ) തുറന്ന് <strong>&apos;Install Smart Madrasa...&apos;</strong> തിരഞ്ഞെടുക്കുക.
                          </>
                        ) : (
                          <>
                            Or open browser menu (
                            <MoreVertical className="w-3.5 h-3.5 inline text-gray-600 mx-0.5" />
                            ) &gt; <strong>&apos;Install Smart Madrasa...&apos;</strong>
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
                onClick={() => {
                  setShowGuideModal(false);
                  setDismissed(true);
                }}
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
