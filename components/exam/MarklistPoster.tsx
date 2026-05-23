import { useRef, useState } from "react";
import { Download, Share2, Loader2, Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassReportRow, ClassReport } from "@/lib/results-api";
import { GRADE_COLORS, TOTAL_GRADE_LABELS } from "@/lib/results-api";

// ── Rank accent colours ───────────────────────────────────────────────────────

const RANK_HEADER: Record<number, { grad: string; badge: string }> = {
  1: { grad: "from-yellow-500 via-amber-400 to-yellow-600", badge: "bg-yellow-700"  },
  2: { grad: "from-slate-400 via-slate-300 to-slate-500",   badge: "bg-slate-600"   },
  3: { grad: "from-amber-600 via-orange-500 to-amber-700",  badge: "bg-amber-800"   },
};
const DEFAULT_GRAD = "from-blue-900 via-blue-700 to-blue-800";
const RANK_MEDALS  = ["🥇", "🥈", "🥉"];

const STATUS_STYLE: Record<string, string> = {
  PASSED:   "bg-emerald-100 text-emerald-800 border-emerald-300",
  FAILED:   "bg-red-100 text-red-800 border-red-300",
  PROMOTED: "bg-blue-100 text-blue-800 border-blue-300",
  WITHHELD: "bg-amber-100 text-amber-800 border-amber-300",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  row: ClassReportRow;
  report: ClassReport;
  madrasaName: string;
  madrasaLogo?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarklistPoster({ row, report, madrasaName, madrasaLogo }: Props) {
  const { student, summary, marks } = row;
  const { exam, subjects, config }  = report;
  const rank = summary.rank ?? 0;

  const posterRef                 = useRef<HTMLDivElement>(null);
  const [photo, setPhoto]         = useState<string | null>(null);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | "share" | null>(null);

  const headerGrad = rank >= 1 && rank <= 3 ? RANK_HEADER[rank].grad : DEFAULT_GRAD;

  const statusLabels: Record<string, string> = {
    PASSED:   config.passedLabel,
    FAILED:   config.failedLabel,
    PROMOTED: config.promotedLabel,
    WITHHELD: config.withheldLabel,
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const capture = async () => {
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(posterRef.current!, {
      scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false,
    });
  };

  const exportJPG = async () => {
    setExporting("jpg");
    try {
      const canvas = await capture();
      const a = document.createElement("a");
      a.download = `result-${student.name.replace(/\s+/g, "-")}.jpg`;
      a.href = canvas.toDataURL("image/jpeg", 0.95);
      a.click();
    } finally { setExporting(null); }
  };

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import("html2canvas").then((m) => m.default),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(posterRef.current!, {
        scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
      const w   = pdf.internal.pageSize.getWidth();
      const h   = (canvas.height / canvas.width) * w;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, Math.min(h, pdf.internal.pageSize.getHeight()));
      pdf.save(`result-${student.name}.pdf`);
    } finally { setExporting(null); }
  };

  const shareJPG = async () => {
    setExporting("share");
    try {
      const canvas = await capture();
      const blob   = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.95));
      if (!blob) return;
      const file = new File([blob], `result-${student.name}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Result · ${student.name}`,
          text:  `${student.name} · ${exam.name} · ${madrasaName}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = `result-${student.name}.jpg`; a.click();
        URL.revokeObjectURL(url);
      }
    } finally { setExporting(null); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={exportJPG} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          JPG
        </button>
        <button onClick={exportPDF} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          PDF
        </button>
        <button onClick={shareJPG} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      {/* ── Poster card ─────────────────────────────────────────────────────────── */}
      <div
        ref={posterRef}
        className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 w-full max-w-sm mx-auto"
        style={{ fontFamily: "'Arial', sans-serif" }}
      >

        {/* Header gradient */}
        <div className={cn("bg-gradient-to-br text-white text-center px-6 py-5 relative overflow-hidden", headerGrad)}>
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white" />
            <div className="absolute -bottom-8  -left-8  w-28 h-28 rounded-full bg-white" />
          </div>
          <div className="relative z-10">
            {madrasaLogo && (
              <img src={madrasaLogo} alt="" className="h-9 w-auto mx-auto mb-2 object-contain" crossOrigin="anonymous" />
            )}
            <p className="text-sm font-bold uppercase tracking-widest leading-tight">{madrasaName}</p>
            <p className="text-xs opacity-75 font-medium mt-0.5">{exam.name}</p>
            <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1">Result Card</p>
          </div>
        </div>

        {/* Student identity */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0">
            {photo
              ? <img src={photo} alt={student.name} className="w-full h-full object-cover" />
              : <span className="text-3xl">{student.gender === "FEMALE" ? "👩‍🎓" : "👨‍🎓"}</span>
            }
          </div>
          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">{student.name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Adm: <span className="font-mono font-semibold text-gray-700">{student.adno}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              Class: <span className="font-semibold text-gray-700">{report.class.name}</span>
            </p>
          </div>
          {/* Rank bubble */}
          {rank > 0 && (
            <div className="text-center shrink-0">
              {rank <= 3 ? (
                <>
                  <div className="text-2xl leading-none">{RANK_MEDALS[rank - 1]}</div>
                  <span className={cn(
                    "mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white",
                    RANK_HEADER[rank]?.badge,
                  )}>
                    {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
                  </span>
                </>
              ) : (
                <span className="text-xs font-bold text-gray-400">#{rank}</span>
              )}
            </div>
          )}
        </div>

        {/* Marks table */}
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 text-gray-500 font-semibold">Subject</th>
              {!config.hideMarks && (
                <th className="text-center px-2 py-2 text-gray-500 font-semibold whitespace-nowrap">Marks</th>
              )}
              <th className="text-center px-2 py-2 text-gray-500 font-semibold">%</th>
              <th className="text-center px-2 py-2 text-gray-500 font-semibold">Grade</th>
              <th className="text-center px-1 py-2 text-gray-500 font-semibold">✓</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, i) => {
              const m          = marks[sub.id];
              const gradeClass = m?.grade ? (GRADE_COLORS[m.grade] ?? "text-gray-600 bg-gray-50 border-gray-200") : "";
              return (
                <tr key={sub.id} className={cn(
                  "border-b border-gray-100",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                  m?.isPassed === false && "bg-red-50/30",
                )}>
                  <td className="px-4 py-2 text-gray-800 font-medium">{sub.name}</td>
                  {!config.hideMarks && (
                    <td className="px-2 py-2 text-center text-gray-700 font-mono whitespace-nowrap">
                      {m != null ? `${m.score}/${m.maxMarks}` : "—"}
                    </td>
                  )}
                  <td className="px-2 py-2 text-center text-gray-600">
                    {m?.percentage != null ? `${m.percentage.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {m?.grade
                      ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", gradeClass)}>{m.grade}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-1 py-2 text-center">
                    {m == null
                      ? <span className="text-gray-300 text-[10px]">—</span>
                      : m.isPassed
                        ? <span className="text-emerald-600 font-bold">✓</span>
                        : <span className="text-red-500 font-bold">✗</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Total row */}
          {summary.totalScore != null && (
            <tfoot>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-4 py-2.5 font-bold text-blue-900 text-xs">Total</td>
                {!config.hideMarks && (
                  <td className="px-2 py-2.5 text-center font-bold text-blue-900 font-mono text-xs whitespace-nowrap">
                    {summary.totalScore?.toFixed(0)}/{summary.totalMaxMarks?.toFixed(0)}
                  </td>
                )}
                <td className="px-2 py-2.5 text-center font-bold text-blue-900 text-xs">
                  {summary.totalPercentage?.toFixed(1)}%
                </td>
                <td colSpan={2} className="px-2 py-2.5 text-center text-blue-700 text-[10px] font-semibold">
                  {summary.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : ""}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Percentage bar + status badges */}
        {summary.totalPercentage != null && (
          <div className="px-5 py-3 border-t border-gray-100 space-y-2.5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all",
                  summary.totalPercentage >= 80 ? "bg-emerald-500" :
                  summary.totalPercentage >= 60 ? "bg-blue-500"    :
                  summary.totalPercentage >= 40 ? "bg-amber-500"   : "bg-red-500",
                )}
                style={{ width: `${Math.min(summary.totalPercentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {summary.finalStatus && (
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", STATUS_STYLE[summary.finalStatus])}>
                  {statusLabels[summary.finalStatus]}
                </span>
              )}
              {summary.totalGrade && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                  {TOTAL_GRADE_LABELS[summary.totalGrade]}
                </span>
              )}
              <span className="text-xs font-bold text-gray-500 ml-auto">
                {summary.totalPercentage?.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Footer watermark */}
        <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-medium">Al Madrasa Platform</span>
          <span className="text-[9px] text-gray-400">{new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
