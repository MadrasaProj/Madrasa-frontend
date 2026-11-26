import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "react-cropper/node_modules/cropperjs/dist/cropper.css";
import { Check, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

/** Passport-size photos (2 × 2 in) are square. */
export const PASSPORT_ASPECT_RATIO = 1;

interface AvatarCropperModalProps {
  file: File;
  aspectRatio?: number;
  outputSize?: number;
  onCrop: (file: File) => void;
  onCancel: () => void;
}

interface CropperInstance {
  zoom: (ratio: number) => void;
  rotate: (degree: number) => void;
  reset: () => void;
  getCroppedCanvas: (options?: Record<string, unknown>) => HTMLCanvasElement | null;
}

export default function AvatarCropperModal({
  file,
  aspectRatio = PASSPORT_ASPECT_RATIO,
  outputSize = 1024,
  onCrop,
  onCancel,
}: AvatarCropperModalProps) {
  const { lang } = useLanguageStore();
  const cropperRef = useRef<ReactCropperElement | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const src = useMemo(() => URL.createObjectURL(file), [file]);

  // Revoke only once the cropper has actually loaded the image. Revoking in a
  // mount-only cleanup breaks the load under React StrictMode, which runs the
  // cleanup immediately after the first mount and before the image request.
  useEffect(() => {
    if (!ready) return;
    return () => URL.revokeObjectURL(src);
  }, [ready, src]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const withCropper = (action: (cropper: CropperInstance) => void) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) action(cropper);
  };

  const apply = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || busy) return;
    const canvas = cropper.getCroppedCanvas({
      maxWidth: outputSize,
      maxHeight: outputSize,
      fillColor: "#ffffff",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!canvas) return;
    setBusy(true);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onCrop(new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  const toolClass =
    "flex size-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("common", "cropImage", lang)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{t("common", "cropImage", lang)}</h3>
            <p className="mt-0.5 text-xs text-gray-500">{t("common", "cropHint", lang)}</p>
          </div>
          <button type="button" aria-label={t("common", "cropCancel", lang)} onClick={onCancel} className={toolClass}>
            <X className="size-4" />
          </button>
        </div>

        <div className="relative h-[min(52vh,26rem)] min-h-64 bg-gray-100">
          <Cropper
            src={src}
            aspectRatio={aspectRatio}
            viewMode={1}
            dragMode="move"
            guides
            center
            responsive
            background={false}
            autoCropArea={0.9}
            checkOrientation={false}
            ready={() => setReady(true)}
            ref={cropperRef}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 border-y border-gray-100 bg-gray-50/70 px-3 py-2">
          <button type="button" title={t("common", "cropZoomOut", lang)} aria-label={t("common", "cropZoomOut", lang)} disabled={!ready} onClick={() => withCropper((c) => c.zoom(-0.1))} className={toolClass}><ZoomOut className="size-4" /></button>
          <button type="button" title={t("common", "cropZoomIn", lang)} aria-label={t("common", "cropZoomIn", lang)} disabled={!ready} onClick={() => withCropper((c) => c.zoom(0.1))} className={toolClass}><ZoomIn className="size-4" /></button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button type="button" title={t("common", "cropRotateLeft", lang)} aria-label={t("common", "cropRotateLeft", lang)} disabled={!ready} onClick={() => withCropper((c) => c.rotate(-90))} className={toolClass}><RotateCcw className="size-4" /></button>
          <button type="button" title={t("common", "cropRotateRight", lang)} aria-label={t("common", "cropRotateRight", lang)} disabled={!ready} onClick={() => withCropper((c) => c.rotate(90))} className={toolClass}><RotateCw className="size-4" /></button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button type="button" title={t("common", "cropReset", lang)} aria-label={t("common", "cropReset", lang)} disabled={!ready} onClick={() => withCropper((c) => c.reset())} className={toolClass}><RotateCcw className="size-4" /></button>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("common", "cropCancel", lang)}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!ready || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            <Check className="size-4" />
            {t("common", "cropApply", lang)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
