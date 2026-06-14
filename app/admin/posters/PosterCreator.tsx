import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { App, Frame } from "leafer-ui";
import { MoveEvent, ZoomEvent } from "@leafer-ui/core";
import "@leafer-in/viewport";
import "@leafer-in/export";

function collectFontFamilies(obj: unknown, families = new Set<string>()): Set<string> {
  if (!obj || typeof obj !== "object") return families;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "fontFamily" && typeof value === "string") {
      families.add(value);
    } else {
      collectFontFamilies(value, families);
    }
  }
  return families;
}

async function loadGoogleFonts(families: Set<string>): Promise<void> {
  const existing = new Set(
    [...document.querySelectorAll("link[href*=\"fonts.googleapis.com\"]")]
      .map((l) => (l as HTMLLinkElement).href)
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

type LayerItem = {
  path: number[];
  tag: string;
  label: string;
  active: boolean;
  preview: string;
};

function isImageFill(fill: unknown): boolean {
  if (!fill) return false;
  if (typeof fill === "object" && !Array.isArray(fill)) {
    return (fill as Record<string, unknown>).type === "image";
  }
  if (Array.isArray(fill)) {
    return fill.some((f) => typeof f === "object" && f !== null && (f as Record<string, unknown>).type === "image");
  }
  return false;
}

function getImageFillUrl(fill: unknown): string | undefined {
  if (!fill) return undefined;
  if (typeof fill === "object" && !Array.isArray(fill)) {
    return (fill as Record<string, unknown>).url as string | undefined;
  }
  if (Array.isArray(fill)) {
    const img = fill.find((f) => typeof f === "object" && f !== null && (f as Record<string, unknown>).type === "image");
    return img ? (img as Record<string, unknown>).url as string | undefined : undefined;
  }
  return undefined;
}

function extractLayers(children: unknown[], parentPath: number[] = []): LayerItem[] {
  const layers: LayerItem[] = [];
  if (!Array.isArray(children)) return layers;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as Record<string, unknown>;
    if (!child || typeof child !== "object") continue;
    const currentPath = [...parentPath, i];
    const tag = child.tag as string;
    const fillIsImage = isImageFill(child.fill);
    if (tag === "Text") {
      layers.push({
        path: currentPath,
        tag,
        label: (child.label as string) ?? "",
        active: (child.active as boolean) ?? false,
        preview: (child.text as string) ?? "Text",
      });
    } else if (tag === "Image" || fillIsImage) {
      layers.push({
        path: currentPath,
        tag: tag === "Image" ? "Image" : `${tag} (Image)`,
        label: (child.label as string) ?? "",
        active: (child.active as boolean) ?? false,
        preview: (child.name as string) ?? tag,
      });
    }
    if (Array.isArray(child.children)) {
      layers.push(...extractLayers(child.children as unknown[], currentPath));
    }
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

export type PosterSize = { width: number; height: number; label: string };

export const POSTER_SIZES: PosterSize[] = [
  { width: 1200, height: 628, label: "Social Media (1200x628)" },
  { width: 1080, height: 1080, label: "Instagram (1080x1080)" },
  { width: 1080, height: 1920, label: "Story (1080x1920)" },
  { width: 1920, height: 1080, label: "Landscape (1920x1080)" },
  { width: 800, height: 600, label: "Custom (800x600)" },
];

export interface PosterCreatorRef {
  getSceneData: () => Record<string, unknown> | null;
}

interface PosterCreatorProps {
  initialData?: Record<string, unknown> | null;
}

export const PosterCreator = forwardRef<PosterCreatorRef, PosterCreatorProps>(
  function PosterCreator({ initialData }, ref) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<App>(null);

    const [posterJson, setPosterJson] = useState(
      initialData ? JSON.stringify(initialData, null, 2) : ""
    );
    const [frameData, setFrameData] = useState<Record<string, unknown> | null>(
      initialData ?? null
    );
    const [layers, setLayers] = useState<LayerItem[]>([]);

    useImperativeHandle(ref, () => ({
      getSceneData: () => frameData,
    }));

  const refreshLayers = useCallback((data: Record<string, unknown>) => {
    setLayers(extractLayers((data.children as unknown[]) ?? []));
  }, []);

  const applyFrame = useCallback(async () => {
    const app = appRef.current;
    if (!app || !frameData) return;
    const families = collectFontFamilies(frameData);
    if (families.size > 0) await loadGoogleFonts(families);
    const copy = JSON.parse(JSON.stringify(frameData));
    copy.x = 0;
    copy.y = 0;
    app.tree.clear();
    app.tree.add((Frame as any).one(copy));
  }, [frameData]);

  useEffect(() => {
    if (frameData) applyFrame();
  }, [frameData, applyFrame]);

  const toggleLayerActive = (layer: LayerItem) => {
    if (!frameData) return;
    const updated = JSON.parse(JSON.stringify(frameData));
    const el = getElementByPath(updated, layer.path);
    if (el) el.active = !el.active;
    setFrameData(updated);
    setPosterJson(JSON.stringify(updated, null, 2));
    refreshLayers(updated);
  };

  const updateLayerLabel = (layer: LayerItem, label: string) => {
    if (!frameData) return;
    const updated = JSON.parse(JSON.stringify(frameData));
    const el = getElementByPath(updated, layer.path);
    if (el) el.label = label;
    setFrameData(updated);
    setPosterJson(JSON.stringify(updated, null, 2));
    setLayers((prev) =>
      prev.map((l) => (l.path.join(",") === layer.path.join(",") ? { ...l, label } : l))
    );
  };

    useEffect(() => {
      if (!canvasRef.current) return;
    const el = canvasRef.current;
    const app = new App({
      view: el,
      fill: "#333",
      tree: {},
      move: { drag: true },
    });
    app.tree.on(MoveEvent.BEFORE_MOVE, (e: any) => {
      app.tree.zoomLayer.move(app.tree.getValidMove(e.moveX, e.moveY));
    });
    app.tree.on(ZoomEvent.BEFORE_ZOOM, (e: any) => {
      const { zoomLayer, layouter } = app.tree;
      const changeScale = app.tree.getValidScale(e.scale);
      if (changeScale !== 1) {
        layouter.stop();
        zoomLayer.scaleOfWorld(e, changeScale);
        layouter.start();
      }
    });
    appRef.current = app;
    return () => {
      app.destroy();
      appRef.current = null;
    };
  }, []);

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <textarea
          className="ring-2 ring-green-600 p-2 rounded-2xl w-full"
          value={posterJson}
          onInput={(e) => setPosterJson((e.target as HTMLTextAreaElement).value)}
          style={{ height: "100px" }}
          placeholder="Paste scene JSON here"
        />
        <button
          onClick={() => {
            try {
              const data = JSON.parse(posterJson);
              if (data.tag !== "Frame") {
                alert("Root element must be a Frame");
                return;
              }
              setFrameData(data);
              refreshLayers(data);
            } catch {
              alert("Invalid JSON");
            }
          }}
          className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg"
        >
          Apply
        </button>
        <div
          ref={canvasRef}
          style={{ border: "1px solid #ccc", marginTop: "10px", height: "500px" }}
        />
      </div>

      {layers.length > 0 && (
        <div className="w-72 shrink-0">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Layers</h3>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {layers.map((layer) => (
              <div
                key={layer.path.join(",")}
                className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                  layer.active ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={layer.active}
                  onChange={() => toggleLayerActive(layer)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                      {layer.tag}
                    </span>
                    <span className="truncate text-gray-800">{layer.preview}</span>
                  </div>
                  <input
                    type="text"
                    value={layer.label}
                    onChange={(e) => updateLayerLabel(layer, e.target.value)}
                    placeholder="Label"
                    className="mt-1 w-full border rounded px-1.5 py-0.5 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  }
);
