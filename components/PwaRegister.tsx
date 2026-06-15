import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

export default function PwaRegister() {
  useEffect(() => {
    registerSW({
      onNeedRefresh() {
        // Optional: show update available notification
      },
      onOfflineReady() {
        // Optional: show offline ready notification
      },
    });
  }, []);

  return null;
}
