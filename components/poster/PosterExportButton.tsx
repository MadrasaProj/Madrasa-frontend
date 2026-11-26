import { useState } from "react";
import { Download, FileText, Printer, Share2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import {
  downloadAsJPG,
  downloadAsPDF,
  shareAsPNG,
  downloadAsPNG,
  inlineImagesForCapture,
} from "@/lib/poster-utils";

export type PosterExportType = "jpg" | "png" | "pdf" | "share";

interface ExportOption {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface PosterExportButtonProps {
  /** Returns the element to capture. Return null to make the options no-ops. */
  getElement: () => HTMLElement | null;
  /** Filename base (without extension) for all downloads. */
  stem: string;
  /** Document that owns the element; used to wait for / inline assets. Defaults to the element's document. */
  getDocument?: () => Document | null | undefined;
  /** Native share-sheet metadata. Defaults to the filename stem. */
  shareTitle?: string;
  shareText?: string;
  /** Override printing. Defaults to the element's window.print(). */
  onPrint?: () => void;
  /** Trigger label. */
  label?: string;
  /** Popover title. */
  title?: string;
  /** Popover description. */
  description?: string;
  /** Popover class names. */
  className?: string;
  /** Trigger button class names. */
  buttonClassName?: string;
}

/** Wait until fonts/images are ready before rasterising. Best-effort only. */
async function waitForAssets(doc: Document | null | undefined): Promise<void> {
  if (!doc) return;
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));

  try {
    await Promise.race([doc.fonts?.ready ?? Promise.resolve(), timeout]);
  } catch {
    /* ignore font loading failures */
  }

  const pending = Array.from(doc.images).filter((img) => !img.complete);
  if (pending.length) {
    await Promise.race([
      Promise.all(
        pending.map(
          (img) =>
            new Promise<void>((resolve) => {
              img.onload = img.onerror = () => resolve();
            }),
        ),
      ),
      timeout,
    ]);
  }
}

/**
 * Self-contained FAB + responsive option sheet for exporting any DOM element
 * as JPG / PNG / PDF, printing it, or sharing it as a PNG.
 */
export function PosterExportButton({
  getElement,
  stem,
  getDocument,
  shareTitle,
  shareText,
  onPrint,
  label = "Export",
  title = "Export",
  description = "Download, print, or share this result card",
  className = "rounded-2xl",
  buttonClassName = "ml-auto rounded-full shadow-lg",
}: PosterExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<PosterExportType | null>(null);

  const run = async (type: PosterExportType) => {
    const el = getElement();
    if (!el) return;
    const doc = getDocument?.() ?? el.ownerDocument;
    setExporting(type);
    try {
      await waitForAssets(doc);
      await inlineImagesForCapture(doc);
      if (type === "jpg") await downloadAsJPG(el, stem);
      if (type === "png") await downloadAsPNG(el, stem);
      if (type === "pdf") await downloadAsPDF(el, stem, "a4");
      if (type === "share") await shareAsPNG(
        el,
        `${stem}.png`,
        shareTitle ?? stem,
        shareText ?? stem,
      );
    } catch (err) {
      console.error("Poster export failed", err);
    } finally {
      setExporting(null);
    }
  };

  const runExport = (type: PosterExportType) => {
    setOpen(false);
    void run(type);
  };

  const handlePrint = () => {
    setOpen(false);
    if (onPrint) {
      onPrint();
      return;
    }
    getElement()?.ownerDocument.defaultView?.print();
  };

  const options: ExportOption[] = [
    { key: "jpg",   label: "JPG",   icon: Download, onClick: () => runExport("jpg") },
    { key: "png",   label: "PNG",   icon: Download, onClick: () => runExport("png") },
    { key: "pdf",   label: "PDF",   icon: FileText, onClick: () => runExport("pdf") },
    { key: "print", label: "Print", icon: Printer,  onClick: handlePrint },
    { key: "share", label: "Share", icon: Share2,   onClick: () => runExport("share") },
  ];

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="lg"
        aria-label={`${label} poster`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={buttonClassName}
      >
        <Download aria-hidden="true" />
        {label}
      </Button>

      <ResponsivePopover
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        compact
        title={title}
        description={description}
        className={className}
      >
        <div className="gap-1 p-2">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={!!exporting}
              onClick={option.onClick}
              className="flex w-full cursor-pointer gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 not-last:border-b not-last:border-gray-100 disabled:opacity-50"
            >
              <option.icon className="size-4" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </ResponsivePopover>
    </>
  );
}
