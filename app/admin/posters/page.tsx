import React, { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";

const EVENTS = [
  "Samastha Dhinam",
  "Nabidhanam",
  "Praveshanam",
  "Keyyeyth Dinam",
  "Prarthana Dinam",
];

type Poster = {
  id: string;
  eventType: string;
  title: string;
  date?: string;
  desc?: string;
  bgColor: string;
  template: string;
  imageData?: string | null;
};

const STORAGE_KEY = "madrasa_posters_v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function createSVG(p: Poster, width = 1200, height = 628) {
  // Basic poster SVG template; text positions depend on selected template
  const bg = p.bgColor || "#059669";
  const img = p.imageData ? `<image href="${p.imageData}" x="0" y="0" width="${width}" height="${Math.floor(height * 0.45)}" preserveAspectRatio="xMidYMid slice"/>` : "";
  const dateLine = p.date ? `<tspan x="40" dy="28" font-size="20" fill="#fff" opacity="0.95">${p.date}</tspan>` : "";

  const titleText = `<text x="40" y="${p.template === "center" ? 320 : 160}" font-family="Inter, Arial, sans-serif" font-size="48" font-weight="700" fill="#fff">${escapeXml(p.title || "")}</text>`;
  const descText = p.desc ? `<text x="40" y="${p.template === "center" ? 380 : 220}" font-family="Inter, Arial, sans-serif" font-size="20" fill="#fff">${escapeXml(p.desc)}</text>` : "";

  const eventText = `<text x="40" y="60" font-family="Inter, Arial, sans-serif" font-size="18" fill="#fff" opacity="0.95">${escapeXml(p.eventType)}</text>`;

  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>
    <defs>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      </style>
    </defs>
    <rect width='100%' height='100%' fill='${bg}' rx='18' />
    ${img}
    <g>
      ${eventText}
      ${dateLine}
      ${titleText}
      ${descText}
    </g>
  </svg>`;
  return svg;
}

function escapeXml(unsafe = "") {
  return unsafe.replace(/[&<>'"]/g, function (c) {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&apos;";
      default: return c;
    }
  });
}

export default function AdminPostersPage() {
  const { lang } = useLanguageStore();
  const [eventType, setEventType] = useState(EVENTS[0]);
  const [title, setTitle] = useState("Special Program");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [bgColor, setBgColor] = useState("#ef4444");
  const [template, setTemplate] = useState("top");
  const [imageData, setImageData] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [list, setList] = useState<Poster[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }, [list]);

  function handleUpload(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const poster: Poster = {
      id: editingId || uid(),
      eventType,
      title,
      date,
      desc,
      bgColor,
      template,
      imageData: imageData || null,
    };

    setList((prev) => {
      const exists = prev.find((p) => p.id === poster.id);
      if (exists) return prev.map((p) => (p.id === poster.id ? poster : p));
      return [poster, ...prev];
    });
    setSaved(true);
    setEditingId(null);
    setTimeout(() => setSaved(false), 1800);
  }

  function handleEdit(id: string) {
    const p = list.find((x) => x.id === id);
    if (!p) return;
    setEditingId(p.id);
    setEventType(p.eventType);
    setTitle(p.title);
    setDate(p.date || "");
    setDesc(p.desc || "");
    setBgColor(p.bgColor || "#059669");
    setTemplate(p.template || "top");
    setImageData(p.imageData || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id: string) {
    setList((prev) => prev.filter((p) => p.id !== id));
  }

  async function exportPNG(p: Poster) {
    const svg = createSVG(p, 1200, 628);
    const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = svg64;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 628;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = `${(p.title || "poster").replace(/\s+/g, "-")}.png`;
    a.click();
  }

  const previewPoster: Poster = {
    id: "preview",
    eventType,
    title,
    date,
    desc,
    bgColor,
    template,
    imageData,
  };

  return (
    <DashboardLayout>
      <PageHeader title={t("adminPages", "postersTitle", lang)} subtitle={t("adminPages", "postersSubtitle", lang)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="col-span-2 bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t("adminPages", "createPoster", lang)}</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500">{t("adminPages", "event", lang)}</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full p-2 rounded border mt-1">
                {EVENTS.map((ev) => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500">{t("adminPages", "template", lang)}</label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full p-2 rounded border mt-1">
                <option value="top">{t("adminPages", "topImage", lang)}</option>
                <option value="center">{t("adminPages", "centeredText", lang)}</option>
                <option value="minimal">{t("adminPages", "minimal", lang)}</option>
              </select>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label className="block text-xs text-gray-500">{t("adminPages", "titleField", lang)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 rounded border mt-1" />
            </div>

            <div>
              <label className="block text-xs text-gray-500">{t("adminPages", "dateField", lang)}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 rounded border mt-1" />
            </div>

            <div>
              <label className="block text-xs text-gray-500">{t("adminPages", "bgColor", lang)}</label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full h-10 p-1 rounded border mt-1" />
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label className="block text-xs text-gray-500">{t("adminPages", "shortDesc", lang)}</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full p-2 rounded border mt-1" rows={3} />
            </div>

            <div>
              <label className="block text-xs text-gray-500">{t("adminPages", "uploadImage", lang)}</label>
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0])} className="w-full mt-1" />
              {imageData && <div className="mt-2 text-xs text-gray-500">{t("adminPages", "imageSelected", lang)}</div>}
            </div>

            <div className="flex items-end gap-2">
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded">{editingId ? t("adminPages", "updatePoster", lang) : t("adminPages", "savePoster", lang)}</button>
              <button onClick={() => {
                setEventType(EVENTS[0]); setTitle(""); setDate(""); setDesc(""); setBgColor("#ef4444"); setTemplate("top"); setImageData(null); setEditingId(null);
              }} className="px-4 py-2 bg-gray-100 rounded">{t("adminPages", "clearPoster", lang)}</button>
              <div className="ml-2 text-sm text-emerald-600">{saved ? t("adminPages", "saved", lang) : ""}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t("adminPages", "preview", lang)}</h3>
          <div ref={previewRef} className="w-full h-auto">
            <div className="w-full overflow-hidden rounded-lg shadow" style={{ width: "100%" }}>
              <div dangerouslySetInnerHTML={{ __html: createSVG(previewPoster, 900, 470) }} />
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => exportPNG(previewPoster)} className="px-4 py-2 bg-blue-600 text-white rounded">{t("adminPages", "exportPNG", lang)}</button>
              {list.length > 0 && (
                <button onClick={() => exportPNG(list[0])} className="px-4 py-2 bg-gray-100 rounded">{t("adminPages", "exportLatest", lang)}</button>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-3 bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t("adminPages", "savedPosters", lang)}</h3>
          <div className="grid gap-3">
            {list.length === 0 && <div className="text-sm text-gray-500">{t("adminPages", "noPosters", lang)}</div>}
            {list.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-14 rounded overflow-hidden shadow-sm">
                    <div dangerouslySetInnerHTML={{ __html: createSVG(p, 320, 180) }} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{p.title}</div>
                    <div className="text-xs text-gray-500">{p.eventType} {p.date ? `· ${p.date}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(p.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded text-sm">{t("adminPages", "editPoster", lang)}</button>
                  <button onClick={() => exportPNG(p)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-sm">{t("adminPages", "exportBtn", lang)}</button>
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm">{t("adminPages", "deletePoster", lang)}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
