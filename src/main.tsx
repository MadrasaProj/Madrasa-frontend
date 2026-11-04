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
    // If the app is already installed or running in standalone mode, suppress prompt
    if (isPwaInstalledSync()) {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = null;
      return;
    }
    e.preventDefault();
    (window as any).__pwaInstallPrompt = e;
    window.dispatchEvent(new Event("pwa-prompt-available"));
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
