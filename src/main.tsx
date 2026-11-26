import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "@/lib/queryClient";
import {
  isPwaInstalledSync,
  markPwaAsInstalled,
  checkPwaInstalledAsync,
} from "@/lib/pwa";
import "../app/globals.css";
import "@leafer-in/export";

// Capture PWA install prompt globally and synchronize install status
if (typeof window !== "undefined") {
  // Auto-recover from chunk loading errors after major deployments
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const key = "vite_preload_error_reload";
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (!last || now - parseInt(last, 10) > 10000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }
  });

  if (isPwaInstalledSync()) {
    markPwaAsInstalled();
  } else {
    void checkPwaInstalledAsync();
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    // If the app is already running in standalone mode, suppress prompt
    if (isPwaInstalledSync()) {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = null;
      return;
    }

    // Always store the prompt event globally and notify all listening buttons
    (window as any).__pwaInstallPrompt = e;
    window.dispatchEvent(new Event("pwa-prompt-available"));

    // Check if the current client is a mobile/touch device
    const isMobile =
      window.matchMedia?.("(pointer: coarse)").matches ||
      window.matchMedia?.("(max-width: 1024px)").matches;

    if (isMobile) {
      // On mobile, suppress the browser's default bottom mini-infobar so our styled UI handles it
      e.preventDefault();
    } else {
      // On desktop (Chrome / Edge), do NOT call preventDefault!
      // This preserves the native direct install button in the address bar (omnibox)
      // and enables "Install Smart Madrasa..." in the browser's 3-dot menu.
      console.log("[PWA] Desktop browser detected: native address bar direct install enabled.");
    }
  });

  window.addEventListener("appinstalled", () => {
    markPwaAsInstalled();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
