// Capture PWA install prompt globally so it is never lost on navigation or login
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    (window as any).__pwaInstallPrompt = e;
    window.dispatchEvent(new Event("pwa-prompt-available"));
  });
  window.addEventListener("appinstalled", () => {
    (window as any).__pwaInstallPrompt = null;
    (window as any).__pwaInstalled = true;
    window.dispatchEvent(new Event("pwa-installed"));
  });
}

if (import.meta.env.DEV) {
  import("react-grab");
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";
import { queryClient } from "@/lib/queryClient";
import "../app/globals.css";
import '@leafer-in/export'

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />}
    </QueryClientProvider>
  </React.StrictMode>
);
