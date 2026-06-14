import { useRef, useState } from "react";
import Cropper from "react-cropper";
import "react-cropper/node_modules/cropperjs/dist/cropper.css";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-[90vw] max-w-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Crop Image</h3>
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
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={!ready}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
