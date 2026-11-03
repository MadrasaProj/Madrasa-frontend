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
