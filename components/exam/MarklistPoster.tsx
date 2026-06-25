import { useRef, useState } from "react";
import { Download, Share2, Loader2, Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassReportRow, ClassReport } from "@/lib/results-api";
import { GRADE_COLORS, TOTAL_GRADE_LABELS } from "@/lib/results-api";
import { downloadAsJPG, downloadAsPDF, shareAsJPG } from "@/lib/poster-utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const RANK_HEADER: Record<number, { grad: string; accent: string }> = {
  1: { grad: "from-yellow-400 via-amber-300 to-yellow-500",  accent: "bg-yellow-600"  },
  2: { grad: "from-slate-400 via-slate-300 to-slate-500",    accent: "bg-slate-600"   },
  3: { grad: "from-amber-500 via-orange-400 to-amber-600",   accent: "bg-amber-700"   },
};
const DEFAULT_GRAD = "from-emerald-800 via-emerald-700 to-teal-850";

const RANK_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const STATUS_STYLE: Record<string, string> = {
  PASSED:   "bg-emerald-100 text-emerald-800 border-emerald-300",
  FAILED:   "bg-red-100    text-red-800    border-red-300",
  PROMOTED: "bg-teal-100   text-teal-800   border-teal-300",
  WITHHELD: "bg-amber-100  text-amber-800  border-amber-300",
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
  const { exam, subjects, config, class: cls } = report;
  const rank = summary.rank ?? 0;

  const posterRef                 = useRef<HTMLDivElement>(null);
  const [photo, setPhoto]         = useState<string | null>(null);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | "share" | null>(null);

  const headerGrad  = rank >= 1 && rank <= 3 ? RANK_HEADER[rank].grad : DEFAULT_GRAD;
  const accentClass = rank >= 1 && rank <= 3 ? RANK_HEADER[rank].accent : "bg-emerald-700";

  const statusLabels: Record<string, string> = {
    PASSED:   config.passedLabel,
    FAILED:   config.failedLabel,
    PROMOTED: config.promotedLabel,
    WITHHELD: config.withheldLabel,
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const stem = `${madrasaName}-${student.name}-${exam.name}`.replace(/\s+/g, "-");

  const run = async (type: "jpg" | "pdf" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg")   await downloadAsJPG(posterRef.current, stem);
      if (type === "pdf")   await downloadAsPDF(posterRef.current, stem);
      if (type === "share") await shareAsJPG(
        posterRef.current, `${stem}.jpg`,
        `Result · ${student.name}`,
        `${student.name} · ${exam.name} · ${madrasaName}`,
      );
    } catch (err) {
      console.error("Poster export failed", err);
    } finally {
      setExporting(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
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
        <button onClick={() => run("jpg")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          JPG
        </button>
        <button onClick={() => run("pdf")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          PDF
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      {/* ── Poster card ── */}
      <div
        ref={posterRef}
        className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 w-full max-w-sm mx-auto select-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {/* Header gradient */}
        <div className={cn("bg-gradient-to-br text-white text-center px-6 pt-6 pb-5 relative overflow-hidden", headerGrad)}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

          <div className="relative z-10 space-y-1">
            {madrasaLogo ? (
              <img src={madrasaLogo} alt="" className="h-10 w-auto mx-auto mb-2 object-contain"
                crossOrigin="anonymous" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-black">
                {madrasaName.charAt(0)}
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-90">{madrasaName}</p>
            <p className="text-base font-extrabold leading-tight">{exam.name}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60">Result Card · {cls.name}</p>
          </div>
        </div>

        {/* Student row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow shrink-0 flex items-center justify-center text-2xl">
            {photo
              ? <img src={photo} alt="" className="w-full h-full object-cover" />
              : (student.gender === "FEMALE" ? "👩" : "👨")
            }
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-snug truncate">{student.name}</p>
            <p className="text-[11px] text-gray-500">
              Reg: <span className="font-mono font-semibold text-gray-700">{student.adno}</span>
            </p>
            <p className="text-[11px] text-gray-500">Class: <span className="font-semibold text-gray-700">{cls.name}</span></p>
          </div>
          {/* Rank badge */}
          {rank > 0 && (
            <div className="text-center shrink-0">
              {rank <= 3 ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl leading-none">{RANK_MEDALS[rank - 1]}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full text-white", accentClass)}>
                    {RANK_LABELS[rank]}
                  </span>
                </div>
              ) : (
                <div className={cn("text-xs font-bold px-2 py-1 rounded-lg text-white", accentClass)}>
                  #{rank}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Marks table */}
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="text-left px-3 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px]">Subject</th>
              {!config.hideMarks && (
                <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Marks</th>
              )}
              <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px]">%</th>
              <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px]">Grade</th>
              <th className="text-center px-1 py-2 text-gray-500 font-bold text-[10px]">✓</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, i) => {
              const m          = marks[sub.id];
              const gradeClass = m?.grade ? (GRADE_COLORS[m.grade] ?? "text-gray-600 bg-gray-50 border-gray-200") : "";
              const failed     = m?.isPassed === false;
              return (
                <tr key={sub.id} className={cn(
                  "border-b border-gray-100",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                  failed && "bg-red-50/40",
                )}>
                  <td className="px-3 py-2 text-gray-800 font-medium text-[11px] leading-tight">{sub.name}</td>
                  {!config.hideMarks && (
                    <td className="px-2 py-2 text-center font-mono text-gray-700 text-[11px] whitespace-nowrap">
                      {m ? `${m.score}/${m.maxMarks}` : "—"}
                    </td>
                  )}
                  <td className="px-2 py-2 text-center text-gray-600 text-[11px]">
                    {m?.percentage != null ? `${m.percentage.toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {m?.grade
                      ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", gradeClass)}>{m.grade}</span>
                      : <span className="text-gray-300 text-[10px]">—</span>
                    }
                  </td>
                  <td className="px-1 py-2 text-center text-[12px] font-bold">
                    {m == null ? <span className="text-gray-300">—</span>
                      : m.isPassed ? <span className="text-emerald-600">✓</span>
                      : <span className="text-red-500">✗</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Total row */}
          {summary.totalScore != null && (
            <tfoot>
              <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-205">
                <td className="px-3 py-2.5 font-black text-emerald-900 text-xs">TOTAL</td>
                {!config.hideMarks && (
                  <td className="px-2 py-2.5 text-center font-black text-emerald-900 font-mono text-xs whitespace-nowrap">
                    {summary.totalScore.toFixed(0)}/{summary.totalMaxMarks?.toFixed(0)}
                  </td>
                )}
                <td className="px-2 py-2.5 text-center font-black text-emerald-900 text-xs">
                  {summary.totalPercentage?.toFixed(1)}%
                </td>
                <td colSpan={2} className="px-2 py-2.5 text-center text-emerald-700 text-[10px] font-bold">
                  {summary.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : ""}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Progress + badges */}
        {summary.totalPercentage != null && (
          <div className="px-4 py-3 space-y-2 border-t border-gray-100">
            {/* Bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full",
                  summary.totalPercentage >= 80 ? "bg-emerald-500" :
                  summary.totalPercentage >= 60 ? "bg-teal-500"    :
                  summary.totalPercentage >= 40 ? "bg-amber-500"   : "bg-red-500",
                )}
                style={{ width: `${Math.min(summary.totalPercentage, 100)}%` }}
              />
            </div>
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {summary.finalStatus && (
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", STATUS_STYLE[summary.finalStatus])}>
                  {statusLabels[summary.finalStatus] ?? summary.finalStatus}
                </span>
              )}
              {summary.totalGrade && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                  {TOTAL_GRADE_LABELS[summary.totalGrade]}
                </span>
              )}
              <span className="ml-auto text-xs font-bold text-gray-500">
                {summary.totalPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Footer watermark */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">Smart Madrasa</span>
          <span className="text-[9px] text-gray-400">{new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
