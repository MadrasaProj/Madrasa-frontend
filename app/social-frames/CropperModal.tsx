import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useRef, useState } from "react";
import Cropper from "react-cropper";

interface CropperModalProps {
  file: File;
  aspectRatio: number;
  onCrop: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function CropperModal({ file, aspectRatio, onCrop, onCancel }: CropperModalProps) {
  const cropperRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const dataUrl = cropper.getCroppedCanvas().toDataURL("image/png");
    onCrop(dataUrl);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[90vw] max-w-2xl p-4">
        <DialogHeader>
          <DialogTitle className="text-sm text-gray-700">Crop Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
        <div className="relative bg-gray-900 rounded overflow-hidden" style={{ maxHeight: "60vh" }}>
          <Cropper
            src={URL.createObjectURL(file)}
            aspectRatio={aspectRatio}
            guides
            zoomable={false}
            rotatable={false}
            scalable={false}
            ready={() => setReady(true)}
            ref={cropperRef}
            style={{ maxHeight: "60vh" }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCrop}
            disabled={!ready}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Apply
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
