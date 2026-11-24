import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Share2, Loader2, Upload, X, FileText, Printer } from "lucide-react";
import type { ClassReport, ClassReportRow } from "@/lib/results-api";
import { downloadAsJPG, downloadAsPDF, shareAsPNG, downloadAsPNG } from "@/lib/poster-utils";
import {
  generateResultCardHTML,
  type ResultCardParams,
} from "@/components/poster/resultCardPoster";

type ExportType = "jpg" | "png" | "pdf" | "share";

interface Props {
  row: ClassReportRow;
  report: ClassReport;
  madrasaName: string;
  madrasaLogo?: string | null;
  studentPhotoMap?: Record<string, string | null>;
}

const RANK_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

// The template renders a real A4 page. Keep it at native size in the iframe and
// scale the iframe to fit the available width so the layout stays pixel-accurate.
const MM_TO_PX = 96 / 25.4;
const PAGE_W = 210 * MM_TO_PX;
const PAGE_H = 297 * MM_TO_PX;
const BODY_PADDING = 24; // matches `body { padding: 24px }` in the template
const DOC_W = PAGE_W + BODY_PADDING * 2;
const DOC_H = PAGE_H + BODY_PADDING * 2;

function fallbackAvatar(name: string, gender: string): string {
  const initial = encodeURIComponent((name || "S").trim().charAt(0).toUpperCase() || "S");
  const fill = gender === "FEMALE" ? "%23be185d" : "%2308984e";
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Crect width='220' height='220' fill='${fill}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='110' fill='%23FFFFFF'%3E${initial}%3C/text%3E%3C/svg%3E`;
}

/** Wait until the iframe has loaded its fonts/images before rasterising it. */
async function waitForAssets(doc: Document | null | undefined): Promise<void> {
  if (!doc) return;
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));

  // Font / image loading is best-effort — never block an export forever.
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

export function ResultCardPoster({ row, report, madrasaName, madrasaLogo, studentPhotoMap }: Props) {
  const { student, summary, marks } = row;
  const { exam, subjects, config, class: cls } = report;

  const wrapRef    = useRef<HTMLDivElement>(null);
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const [scale, setScale]     = useState(1);
  const [photoState, setPhotoState] = useState<{ id: string; url: string | null } | null>(null);
  const [exporting, setExporting]   = useState<ExportType | null>(null);

  const photo = photoState?.id === student.id
    ? photoState.url
    : (studentPhotoMap?.[student.id] ?? null);

  const setPhoto = (url: string | null) => setPhotoState({ id: student.id, url });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DOC_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const params = useMemo<ResultCardParams>(() => {
    const statusLabels: Record<string, string> = {
      PASSED:   config.passedLabel,
      FAILED:   config.failedLabel,
      PROMOTED: config.promotedLabel,
      WITHHELD: config.withheldLabel,
    };

    const statusText = summary.finalStatus
      ? (statusLabels[summary.finalStatus] ?? summary.finalStatus)
      : undefined;

    const passed =
      summary.finalStatus === "PASSED" || summary.finalStatus === "PROMOTED"
        ? true
        : summary.finalStatus === "FAILED" || summary.finalStatus === "WITHHELD"
          ? false
          : undefined;

    return {
      badgeText: "Result Card",
      student: {
        name: student.name,
        regNo: student.adno,
        className: cls.name,
        avatarUrl: photo ?? fallbackAvatar(student.name, student.gender),
        rank: summary.rank ? (RANK_LABELS[summary.rank] ?? `#${summary.rank}`) : null,
      },
      subjects: subjects.map((sub) => {
        const m = marks[sub.id];
        return {
          name: sub.name,
          marks: m?.score ?? 0,
          maxMarks: m?.maxMarks ?? sub.maxMarks,
          grade: m?.grade ?? "—",
          passed: m?.isPassed ?? true,
        };
      }),
      summary: {
        totalMarks: summary.totalScore ?? undefined,
        totalMaxMarks: summary.totalMaxMarks ?? undefined,
        percentage: summary.totalPercentage ?? undefined,
        passed,
        statusText,
      },
      institution: {
        name: madrasaName,
        examSubtitle: `${exam.name} · ${cls.name}`,
        logoUrl: madrasaLogo ?? undefined,
      },
    };
  }, [student, marks, summary, subjects, config, cls, exam, madrasaName, madrasaLogo, photo]);

  const html = useMemo(() => generateResultCardHTML(params), [params]);
  const stem = `${madrasaName}-${student.name}-${exam.name}`.replace(/\s+/g, "-");

  const run = async (type: ExportType) => {
    const doc = iframeRef.current?.contentDocument;
    const el = doc?.querySelector<HTMLElement>(".a4-page");
    if (!el) return;
    setExporting(type);
    try {
      await waitForAssets(doc);
      if (type === "jpg")   await downloadAsJPG(el, stem);
      if (type === "png")   await downloadAsPNG(el, stem);
      if (type === "pdf")   await downloadAsPDF(el, stem, "a4");
      if (type === "share") await shareAsPNG(
        el, `${stem}.png`,
        `Result · ${student.name}`,
        `${student.name} · ${exam.name} · ${madrasaName}`,
      );
    } catch (err) {
      console.error("Result card export failed", err);
    } finally {
      setExporting(null);
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors";

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className={btn + " cursor-pointer"}>
          <Upload className="w-4 h-4" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove uploaded photo">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => run("jpg")} disabled={!!exporting} className={btn}>
          {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          JPG
        </button>
        <button onClick={() => run("png")} disabled={!!exporting} className={btn}>
          {exporting === "png" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          PNG
        </button>
        <button onClick={() => run("pdf")} disabled={!!exporting} className={btn}>
          {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          PDF
        </button>
        <button onClick={() => iframeRef.current?.contentWindow?.print()} disabled={!!exporting} className={btn}>
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      {/* ── A4 result card (rendered from resultCardPoster.ts) ── */}
      <div
        ref={wrapRef}
        className="w-full overflow-hidden rounded-xl border border-gray-200 bg-[#F3F4F6] shadow-xl"
        style={{ aspectRatio: `${DOC_W} / ${DOC_H}` }}
      >
        <iframe
          ref={iframeRef}
          title={`${student.name} — result card`}
          srcDoc={html}
          sandbox="allow-same-origin allow-modals"
          scrolling="no"
          className="block border-0 bg-transparent"
          style={{
            width: DOC_W,
            height: DOC_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
