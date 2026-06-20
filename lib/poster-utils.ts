/**
 * Shared poster capture / download / share utilities.
 * Centralises the DOM-attachment trick needed for <a>.click() to work
 * across Firefox, Chrome, Safari, and mobile WebViews.
 */

// ── Cover image extraction ─────────────────────────────────────────────────────

export function getCoverImageUrl(sceneData: unknown): string | null {
  if (!sceneData || typeof sceneData !== "object") return null;
  const obj = sceneData as Record<string, unknown>;

  if (obj.tag === "Image" && typeof obj.url === "string") return obj.url;

  const fill = obj.fill;
  if (fill && typeof fill === "object") {
    const fillObj = fill as Record<string, unknown>;
    if (fillObj.type === "image" && typeof fillObj.url === "string") return fillObj.url;
    if (Array.isArray(fill)) {
      for (const f of fill) {
        if (f && typeof f === "object" && (f as Record<string, unknown>).type === "image" && typeof (f as Record<string, unknown>).url === "string")
          return (f as Record<string, unknown>).url as string;
      }
    }
  }

  const children = obj.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const url = getCoverImageUrl(child);
      if (url) return url;
    }
  }

  return null;
}

// ── Core capture ──────────────────────────────────────────────────────────────

export async function captureElement(
  el: HTMLElement,
  options: { scale?: number; bg?: string | null } = {},
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas-pro")).default;
  return html2canvas(el, {
    scale:           options.scale ?? 3,
    useCORS:         true,
    allowTaint:      false,
    backgroundColor: options.bg === null ? null : (options.bg ?? "#ffffff"),
    logging:         false,
    imageTimeout:    15_000,
  });
}

// ── Download helpers ─────────────────────────────────────────────────────────
// IMPORTANT: <a> must be in the DOM for .click() to work in Firefox / Safari.

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href     = href;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    if (href.startsWith("blob:")) URL.revokeObjectURL(href);
  }, 200);
}

export async function downloadAsJPG(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElement(el);
  triggerAnchorDownload(
    canvas.toDataURL("image/jpeg", 0.95),
    filename.endsWith(".jpg") ? filename : `${filename}.jpg`,
  );
}

export async function downloadAsPDF(
  el: HTMLElement,
  filename: string,
  format: "a4" | "a5" = "a5",
): Promise<void> {
  const [canvas, jsPDFModule] = await Promise.all([
    captureElement(el),
    import("jspdf"),
  ]);
  // jsPDF v4 uses default export; v2-3 used named. Handle both.
  const JsPDF = (jsPDFModule as any).default ?? (jsPDFModule as any).jsPDF;
  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format });
  const w = pdf.internal.pageSize.getWidth();
  const h = (canvas.height / canvas.width) * w;
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0, 0, w,
    Math.min(h, pdf.internal.pageSize.getHeight()),
  );
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export async function shareAsJPG(
  el: HTMLElement,
  filename: string,
  shareTitle: string,
  shareText: string,
): Promise<void> {
  const canvas = await captureElement(el);
  const blob   = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", 0.95),
  );
  if (!blob) return;

  const file = new File([blob], filename.endsWith(".jpg") ? filename : `${filename}.jpg`, {
    type: "image/jpeg",
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: shareTitle, text: shareText });
  } else {
    // Fallback: download
    triggerAnchorDownload(URL.createObjectURL(blob), file.name);
  }
}

// ── Transparent-background capture (for rank poster gradient) ─────────────────

export async function downloadTransparentJPG(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElement(el, { bg: null });
  triggerAnchorDownload(
    canvas.toDataURL("image/jpeg", 0.95),
    filename.endsWith(".jpg") ? filename : `${filename}.jpg`,
  );
}

export async function shareTransparentJPG(
  el: HTMLElement,
  filename: string,
  shareTitle: string,
  shareText: string,
): Promise<void> {
  const canvas = await captureElement(el, { bg: null });
  const blob   = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", 0.95),
  );
  if (!blob) return;
  const file = new File([blob], filename.endsWith(".jpg") ? filename : `${filename}.jpg`, {
    type: "image/jpeg",
  });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: shareTitle, text: shareText });
  } else {
    triggerAnchorDownload(URL.createObjectURL(blob), file.name);
  }
}
