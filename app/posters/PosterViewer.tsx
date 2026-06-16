import { useEffect, useRef, useState } from "react";
import { Leafer, Frame } from "leafer-ui";
import { getPoster, type PosterRecord } from "@/lib/posters-api";
import { useAuthStore } from "@/store/auth";
import { Download, Loader2, Type, ImageIcon, Upload } from "lucide-react";
import CropperModal from "./CropperModal";

type LayerItem = {
  path: number[];
  tag: string;
  label: string;
  text?: string;
  width: number;
  height: number;
};

function collectFontFamilies(obj: unknown, families = new Set<string>()): Set<string> {
  if (!obj || typeof obj !== "object") return families;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "fontFamily" && typeof value === "string") families.add(value);
    else collectFontFamilies(value, families);
  }
  return families;
}

async function loadGoogleFonts(families: Set<string>): Promise<void> {
  const existing = new Set(
    [...document.querySelectorAll("link[href*=\"fonts.googleapis.com\"]")].map(
      (l) => (l as HTMLLinkElement).href,
    ),
  );
  for (const family of families) {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    if (!existing.has(url)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }
  await document.fonts.ready;
}

function isImageFill(fill: unknown): boolean {
  if (!fill) return false;
  if (typeof fill === "object" && !Array.isArray(fill))
    return (fill as Record<string, unknown>).type === "image";
  if (Array.isArray(fill))
    return fill.some((f) => typeof f === "object" && f !== null && (f as Record<string, unknown>).type === "image");
  return false;
}

function extractActiveLayers(children: unknown[], parentPath: number[] = []): LayerItem[] {
  const layers: LayerItem[] = [];
  if (!Array.isArray(children)) return layers;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as Record<string, unknown>;
    if (!child || typeof child !== "object") continue;
    const currentPath = [...parentPath, i];
    const tag = child.tag as string;
    const isActive = (child.active as boolean) ?? false;
    const w = (child.width as number) ?? 100;
    const h = (child.height as number) ?? 100;
    if (isActive) {
      if (tag === "Text") {
        layers.push({ path: currentPath, tag, label: (child.label as string) ?? "", text: child.text as string, width: w, height: h });
      } else if (tag === "Image" || isImageFill(child.fill)) {
        layers.push({ path: currentPath, tag: tag === "Image" ? "Image" : `${tag} (Image)`, label: (child.label as string) ?? "", width: w, height: h });
      }
    }
    if (Array.isArray(child.children))
      layers.push(...extractActiveLayers(child.children as unknown[], currentPath));
  }
  return layers;
}

function getElementByPath(data: Record<string, unknown>, path: number[]): Record<string, unknown> | null {
  let current: Record<string, unknown> | undefined = data;
  for (const index of path) {
    if (!current?.children || !Array.isArray(current.children)) return null;
    current = current.children[index] as Record<string, unknown>;
  }
  return current ?? null;
}

interface CropperState {
  file: File;
  layer: LayerItem;
}

interface PosterViewerProps {
  posterId: string;
}

export default function PosterViewer({ posterId }: PosterViewerProps) {
  const { user } = useAuthStore();
  const clientId = user?.clientId ?? "";

  const canvasRef = useRef<HTMLDivElement>(null);
  const leaferRef = useRef<Leafer | null>(null);

  const [poster, setPoster] = useState<PosterRecord | null>(null);
  const [sceneData, setSceneData] = useState<Record<string, unknown> | null>(null);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);
  const [cropper, setCropper] = useState<CropperState | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    setFontsReady(false);

    getPoster(clientId, posterId)
      .then(async (p) => {
        if (cancelled) return;
        const data = p.sceneData as Record<string, unknown>;
        setPoster(p);
        setSceneData(data);
        setLayers(extractActiveLayers((data?.children as unknown[]) ?? []));
        setFrameSize({ w: (data.width as number) ?? 800, h: (data.height as number) ?? 600 });
        const families = collectFontFamilies(data);
        if (families.size > 0) await loadGoogleFonts(families);
        if (!cancelled) {
          setLoading(false);
          requestAnimationFrame(() => {
            if (!cancelled) setFontsReady(true);
          });
        }
      })
      .catch(() => {
        if (!cancelled) { setPoster(null); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [clientId, posterId]);

  useEffect(() => {
    if (!fontsReady || !canvasRef.current || !sceneData || !frameSize) return;

    const el = canvasRef.current;
    const scale = Math.min(el.clientWidth / frameSize.w, el.clientHeight / frameSize.h);
    const w = Math.floor(frameSize.w * scale);
    const h = Math.floor(frameSize.h * scale);

    const leafer = new Leafer({ view: el, width: w, height: h, fill: "#fff" });
    leafer.zoomLayer.scale = { x: scale, y: scale } as any;
    const copy = JSON.parse(JSON.stringify(sceneData));
    copy.x = 0;
    copy.y = 0;
    leafer.add((Frame as any).one(copy));
    leaferRef.current = leafer;

    return () => { leafer.destroy(); leaferRef.current = null; };
  }, [fontsReady, sceneData, frameSize]);

  const updateText = (layer: LayerItem, value: string) => {
    if (!sceneData) return;
    const updated = JSON.parse(JSON.stringify(sceneData));
    const el = getElementByPath(updated, layer.path);
    if (el) el.text = value;
    setSceneData(updated);
    setLayers((prev) =>
      prev.map((l) => (l.path.join(",") === layer.path.join(",") ? { ...l, text: value } : l)),
    );
  };

  const applyCroppedImage = (dataUrl: string, layer: LayerItem) => {
    if (!sceneData) return;
    const updated = JSON.parse(JSON.stringify(sceneData));
    const el = getElementByPath(updated, layer.path);
    if (!el) return;

    if (el.tag === "Image") {
      el.url = dataUrl;
    } else if (!el.fill || typeof el.fill === "string") {
      el.fill = { type: "image", url: dataUrl };
    } else if (Array.isArray(el.fill)) {
      const idx = el.fill.findIndex((f: any) => f?.type === "image");
      if (idx >= 0) el.fill[idx].url = dataUrl;
      else el.fill.push({ type: "image", url: dataUrl });
    } else if (typeof el.fill === "object") {
      (el.fill as Record<string, unknown>).url = dataUrl;
    }

    setSceneData(updated);
    setCropper(null);
  };

  const handleDownload = async () => {
    const leafer = leaferRef.current;
    if (!leafer) return;
    try {
      const result = await leafer.export("png",{pixelRatio:2,quality:1}); 
      if (!result) return;
         
      const a = document.createElement("a");
      a.href = result.data;
      a.download = `${poster?.title ?? "poster"}.png`;
      a.click();
     } catch {
      alert("Failed to export image");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading poster...
      </div>
    );
  }

  if (!poster) {
    return <div className="text-center py-20 text-gray-400">Poster not found.</div>;
  }

  return (
    <div className="space-y-4">
      {cropper && (
        <CropperModal
          file={cropper.file}
          aspectRatio={cropper.layer.width / cropper.layer.height}
          onCrop={(dataUrl) => applyCroppedImage(dataUrl, cropper.layer)}
          onCancel={() => setCropper(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{poster.title}</h1>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            style={{
              border: "1px solid #ccc",
              width: "100%",
              aspectRatio: frameSize ? `${frameSize.w} / ${frameSize.h}` : "16 / 9",
            }}
          />
        </div>




 {layers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-3">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-4">
            <div className="flex flex-wrap gap-3">
              {layers.map((layer) => (
                <div key={layer.path.join(",")} className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-medium text-white/70 mb-1 truncate">
                    {layer.label || layer.tag}
                  </label>
                  {layer.tag === "Text" && layer.text !== undefined ? (
                    <input
                      type="text"
                      value={layer.text}
                      onChange={(e) => updateText(layer, e.target.value)}
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-colors"
                    />
                  ) : layer.tag.includes("Image") ? (
                    <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-sm transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Choose image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCropper({ file, layer });
                        }}
                        className="hidden"
                      />
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        
      </div>
    </div>
  );
}
