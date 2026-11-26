import { useCallback, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import AvatarCropperModal, { PASSPORT_ASPECT_RATIO } from "@/components/ui/AvatarCropperModal";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

interface UseAvatarCropperOptions {
  /** Defaults to a passport-size square crop. */
  aspectRatio?: number;
  /** Max width/height of the uploaded image. Defaults to 1024px. */
  outputSize?: number;
  /** Max source image size in MB, rejected before cropping. Defaults to 10MB. */
  maxSourceSizeMB?: number;
}

interface PendingCrop {
  source: File;
  resolve: (file: File | null) => void;
}

/**
 * Opens the avatar cropper for a picked image and resolves with the cropped
 * JPEG File. Resolves with `null` when the user cancels or the file is invalid.
 * Render `modal` somewhere in the calling component.
 */
export function useAvatarCropper(options: UseAvatarCropperOptions = {}): {
  crop: (file: File) => Promise<File | null>;
  modal: ReactNode;
} {
  const { lang } = useLanguageStore();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [pending, setPending] = useState<PendingCrop | null>(null);

  const crop = useCallback((file: File): Promise<File | null> => {
    const settings = optionsRef.current;
    if (!file.type.startsWith("image/")) {
      toast.error(t("common", "cropInvalidType", lang));
      return Promise.resolve(null);
    }
    if (file.size > (settings.maxSourceSizeMB ?? 10) * 1024 * 1024) {
      toast.error(t("common", "cropTooLarge", lang));
      return Promise.resolve(null);
    }
    return new Promise<File | null>((resolve) => setPending({ source: file, resolve }));
  }, [lang]);

  const settle = (result: File | null) => {
    pending?.resolve(result);
    setPending(null);
  };

  const modal = pending ? (
    <AvatarCropperModal
      file={pending.source}
      aspectRatio={options.aspectRatio ?? PASSPORT_ASPECT_RATIO}
      outputSize={options.outputSize ?? 1024}
      onCrop={settle}
      onCancel={() => settle(null)}
    />
  ) : null;

  return { crop, modal };
}
