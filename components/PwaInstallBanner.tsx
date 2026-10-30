import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const standalone = window.matchMedia("(display-mode: standalone)");
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIos(ios);

    const updateVisibility = () => {
      const installed = standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setOpen(mobile.matches && !installed && !dismissed);
    };
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      updateVisibility();
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setOpen(false);
    };

    updateVisibility();
    mobile.addEventListener("change", updateVisibility);
    standalone.addEventListener("change", updateVisibility);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      mobile.removeEventListener("change", updateVisibility);
      standalone.removeEventListener("change", updateVisibility);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [dismissed]);

  const close = () => {
    setDismissed(true);
    setOpen(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    close();
  };

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={(next) => { if (!next) close(); }}
      compact
      showCloseButton={false}
      title="Install Smart Madrasa"
      beforeHeader={<img src="/imgs/pwa-install-banner.png" alt="An app icon being added to a phone's app list" width={300} height={230} className="mx-auto h-[230px] max-w-full w-[300px] object-cover" />}
    >
      <div className="space-y-4 px-5 pb-6 pt-1">
        <p className="text-sm text-gray-600">Put Smart Madrasa directly in your app list for quick access.</p>
        {!installPrompt && (isIos ? (
          <p className="flex items-start gap-2 text-sm text-gray-600"><Share2 className="mt-0.5 size-4 shrink-0" /> In Safari, tap Share, then Add to Home Screen.</p>
        ) : (
          <p className="text-sm text-gray-600">Open your browser menu and choose Install app or Add to Home screen.</p>
        ))}
        <div className="flex gap-3">
          <Button type="button" size="lg" variant="outline" className="min-w-0 flex-1" onClick={close}>Maybe later</Button>
          <Button type="button" size="lg" className="min-w-0 flex-1 bg-primary-600 text-white hover:bg-primary-700" onClick={installPrompt ? install : close}>
            {installPrompt ? <><Download className="mr-2 size-4" /> Install app</> : "Got it"}
          </Button>
        </div>
      </div>
    </ResponsivePopover>
  );
}
