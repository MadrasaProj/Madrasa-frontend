import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/pwa";

export default function PwaInstallBanner() {
  const { isInstalled, installPrompt, promptToInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("pwa_banner_dismissed") === "true") {
        setDismissed(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isInstalled || dismissed || !installPrompt) {
      setOpen(false);
      return;
    }

    const mobile = window.matchMedia("(max-width: 767px)");
    const updateVisibility = () => {
      setOpen(mobile.matches && !isInstalled && !dismissed && Boolean(installPrompt));
    };

    updateVisibility();
    mobile.addEventListener("change", updateVisibility);
    return () => {
      mobile.removeEventListener("change", updateVisibility);
    };
  }, [isInstalled, dismissed, installPrompt]);

  const close = () => {
    setDismissed(true);
    setOpen(false);
    try {
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    } catch {}
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    try {
      await promptToInstall();
    } finally {
      close();
    }
  };

  // If already installed, dismissed, or no install prompt available, never render
  if (isInstalled || dismissed || !installPrompt) return null;

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      compact
      showCloseButton={false}
      title="Install Smart Madrasa"
      beforeHeader={
        <img
          src="/imgs/pwa-install-banner.png"
          alt="An app icon being added to a phone's app list"
          width={300}
          height={230}
          className="mx-auto h-[230px] max-w-full w-[300px] object-cover"
        />
      }
    >
      <div className="space-y-4 px-5 pb-6 pt-1">
        <p className="text-sm text-gray-600">
          Put Smart Madrasa directly in your app list for quick access.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-w-0 rounded-full flex-1"
            onClick={close}
          >
            Maybe later
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-w-0 flex-1 bg-primary-600 rounded-full text-white hover:bg-primary-700"
            onClick={handleInstall}
          >
            <Download className="mr-2 size-4" /> Install app
          </Button>
        </div>
      </div>
    </ResponsivePopover>
  );
}
