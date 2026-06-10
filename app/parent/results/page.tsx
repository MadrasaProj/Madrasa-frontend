import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getResults, getSummaries, type ResultRecord, type ExamSummary, GRADE_COLORS, TOTAL_GRADE_LABELS } from "@/lib/results-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { downloadAsJPG, downloadAsPDF, shareAsJPG, downloadTransparentJPG, shareTransparentJPG } from "@/lib/poster-utils";
import {
  Medal, Loader2, AlertCircle, RefreshCw, GraduationCap, Trophy,
  Download, Share2, Upload, X, FileText, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function calcFallbackGrade(score: number, totalMarks: number): string {
  const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 36) return "D+";
  return "D";
}

function gradeIsPassed(grade: string) { return grade !== "D"; }

const RANK_HEADER: Record<number, { grad: string; badge: string }> = {
  1: { grad: "from-yellow-500 via-amber-400 to-yellow-600", badge: "bg-yellow-700" },
  2: { grad: "from-slate-400 via-slate-300 to-slate-500",   badge: "bg-slate-600"  },
  3: { grad: "from-amber-600 via-orange-500 to-amber-700",  badge: "bg-amber-800"  },
};
const DEFAULT_GRAD = "from-emerald-800 via-emerald-700 to-teal-700";
const RANK_MEDALS  = ["🥇", "🥈", "🥉"];
const RANK_LABELS  = ["1st Place", "2nd Place", "3rd Place"];

const RANK_POSTER_GRADIENTS: Record<number, { bg: string; badge: string; text: string }> = {
  1: { bg: "from-yellow-400 via-amber-300 to-yellow-500", badge: "bg-yellow-600",  text: "text-yellow-900"  },
  2: { bg: "from-slate-400 via-gray-300 to-slate-500",   badge: "bg-slate-600",   text: "text-slate-900"   },
  3: { bg: "from-amber-600 via-orange-400 to-amber-700", badge: "bg-amber-800",   text: "text-amber-900"   },
};

const STATUS_STYLE: Record<string, string> = {
  PASSED:   "bg-emerald-100 text-emerald-800 border-emerald-300",
  FAILED:   "bg-red-100 text-red-800 border-red-300",
  PROMOTED: "bg-blue-100 text-blue-800 border-blue-300",
  WITHHELD: "bg-amber-100 text-amber-800 border-amber-300",
};

type Tab = "results" | "card" | "rank";

// ── Result Card (shareable poster) ────────────────────────────────────────────

function ParentResultCard({
  studentName, studentAdo, studentGender, studentClass,
  results, summary, exam, madrasaName, madrasaLogo,
}: {
  studentName: string; studentAdo: string;
  studentGender: string | null; studentClass: string;
  results: ResultRecord[];
  summary: ExamSummary | null;
  exam: ExamRecord;
  madrasaName: string;
  madrasaLogo?: string | null;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto]         = useState<string | null>(null);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | "share" | null>(null);

  const rank        = summary?.rank ?? null;
  const headerGrad  = rank && rank <= 3 ? RANK_HEADER[rank].grad : DEFAULT_GRAD;
  const totalScore  = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax    = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const totalPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalScore / totalMax) * 100 : 0);
  const finalStatus = summary?.finalStatus ?? null;
  const totalGrade  = summary?.totalGrade  ?? null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const stem = `result-${studentName}`.replace(/\s+/g, "-");

  const run = async (type: "jpg" | "pdf" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg")   await downloadAsJPG(posterRef.current, stem);
      if (type === "pdf")   await downloadAsPDF(posterRef.current, stem);
      if (type === "share") await shareAsJPG(
        posterRef.current, `${stem}.jpg`,
        `Result · ${studentName}`,
        `${studentName} · ${exam.name} · ${madrasaName}`,
      );
    } catch (err) {
      console.error("Result card export failed", err);
    } finally { setExporting(null); }
  };

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
          <button onClick={() => setPhoto(null)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      {/* Poster */}
      <div ref={posterRef}
        className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 w-full max-w-sm mx-auto"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className={cn("bg-gradient-to-br text-white text-center px-6 py-5 relative overflow-hidden", headerGrad)}>
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white" />
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
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0">
            {photo
              ? <img src={photo} alt={studentName} className="w-full h-full object-cover" />
              : <span className="text-3xl">{studentGender === "FEMALE" ? "👩" : "👨"}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">{studentName}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Adm: <span className="font-mono font-semibold text-gray-700">{studentAdo}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              Class: <span className="font-semibold text-gray-700">{studentClass}</span>
            </p>
          </div>
          {rank && rank > 0 && (
            <div className="text-center shrink-0">
              {rank <= 3 ? (
                <>
                  <div className="text-2xl leading-none">{RANK_MEDALS[rank - 1]}</div>
                  <span className={cn("mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white", RANK_HEADER[rank]?.badge)}>
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
              <th className="text-center px-2 py-2 text-gray-500 font-semibold whitespace-nowrap">Marks</th>
              <th className="text-center px-2 py-2 text-gray-500 font-semibold">%</th>
              <th className="text-center px-2 py-2 text-gray-500 font-semibold">Grade</th>
              <th className="text-center px-1 py-2 text-gray-500 font-semibold">✓</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const grade     = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
              const isPassed  = r.isPassed ?? gradeIsPassed(grade);
              const pct       = r.percentage ?? (r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0);
              const gradeClass = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";
              return (
                <tr key={r.id} className={cn(
                  "border-b border-gray-100",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                  !isPassed && "bg-red-50/30",
                )}>
                  <td className="px-4 py-2 text-gray-800 font-medium">{r.subject?.name ?? "—"}</td>
                  <td className="px-2 py-2 text-center text-gray-700 font-mono whitespace-nowrap">
                    {r.score}/{r.totalMarks}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600">{pct.toFixed(1)}%</td>
                  <td className="px-2 py-2 text-center">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", gradeClass)}>{grade}</span>
                  </td>
                  <td className="px-1 py-2 text-center">
                    {isPassed
                      ? <span className="text-emerald-600 font-bold">✓</span>
                      : <span className="text-red-500 font-bold">✗</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t-2 border-blue-200">
              <td className="px-4 py-2.5 font-bold text-blue-900 text-xs">Total</td>
              <td className="px-2 py-2.5 text-center font-bold text-blue-900 font-mono text-xs whitespace-nowrap">
                {totalScore.toFixed(0)}/{totalMax.toFixed(0)}
              </td>
              <td className="px-2 py-2.5 text-center font-bold text-blue-900 text-xs">
                {totalPct.toFixed(1)}%
              </td>
              <td colSpan={2} className="px-2 py-2.5 text-center text-blue-700 text-[10px] font-semibold">
                {totalGrade ? (TOTAL_GRADE_LABELS[totalGrade] ?? totalGrade) : ""}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Percentage bar + status badges */}
        <div className="px-5 py-3 border-t border-gray-100 space-y-2.5">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                totalPct >= 80 ? "bg-emerald-500" :
                totalPct >= 60 ? "bg-blue-500"    :
                totalPct >= 40 ? "bg-amber-500"   : "bg-red-500",
              )}
              style={{ width: `${Math.min(totalPct, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {finalStatus && (
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", STATUS_STYLE[finalStatus])}>
                {finalStatus}
              </span>
            )}
            {totalGrade && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                {TOTAL_GRADE_LABELS[totalGrade] ?? totalGrade}
              </span>
            )}
            <span className="text-xs font-bold text-gray-500 ml-auto">{totalPct.toFixed(2)}%</span>
          </div>
        </div>

        {/* Footer watermark */}
        <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-medium">Al Madrasa Platform</span>
          <span className="text-[9px] text-gray-400">{new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Rank Poster (for top 1/2/3) ───────────────────────────────────────────────

function ParentRankCard({
  studentName, studentAdo, studentGender, studentClass,
  summary, exam, madrasaName, madrasaLogo,
}: {
  studentName: string; studentAdo: string;
  studentGender: string | null; studentClass: string;
  summary: ExamSummary;
  exam: ExamRecord;
  madrasaName: string;
  madrasaLogo?: string | null;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto]         = useState<string | null>(null);
  const [exporting, setExporting] = useState<"jpg" | "share" | null>(null);
  const rank = summary.rank!;
  const g    = RANK_POSTER_GRADIENTS[rank] ?? RANK_POSTER_GRADIENTS[3];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const stem = `rank-${rank}-${studentName}`.replace(/\s+/g, "-");

  const run = async (type: "jpg" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg") {
        await downloadTransparentJPG(posterRef.current, stem);
      } else {
        await shareTransparentJPG(
          posterRef.current, `${stem}.jpg`,
          `Congratulations ${studentName}!`,
          `${studentName} secured ${RANK_LABELS[rank - 1]} in ${exam.name} · ${madrasaName}`,
        );
      }
    } catch (err) {
      console.error("Rank card export failed", err);
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => run("jpg")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download JPG
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      <div ref={posterRef}
        className={cn("relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b", g.bg)}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative z-10 flex flex-col items-center px-8 py-8 gap-4">
          <div className="flex flex-col items-center gap-1">
            {madrasaLogo && (
              <img src={madrasaLogo} alt="logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
            )}
            <p className={cn("text-xs font-semibold uppercase tracking-widest opacity-80", g.text)}>{madrasaName}</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-6xl leading-none">{RANK_MEDALS[rank - 1]}</span>
            <span className={cn("mt-2 px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase text-white shadow", g.badge)}>
              {RANK_LABELS[rank - 1]}
            </span>
          </div>
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white/30 flex items-center justify-center">
            {photo
              ? <img src={photo} alt={studentName} className="w-full h-full object-cover" />
              : <span className="text-5xl">{studentGender === "FEMALE" ? "👩" : "👨"}</span>
            }
          </div>
          <div className="text-center">
            <p className={cn("text-xl font-extrabold leading-tight", g.text)}>{studentName}</p>
            <p className={cn("text-sm opacity-75 mt-0.5", g.text)}>{studentClass} · Reg: {studentAdo}</p>
          </div>
          <div className="w-full bg-white/30 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2 opacity-70", g.text)}>{exam.name}</p>
            <div className="flex justify-around">
              {[
                { label: "Score",  value: summary.totalPercentage != null ? `${summary.totalPercentage.toFixed(1)}%` : "—" },
                { label: "Rank",   value: `#${rank}` },
                { label: "Total",  value: summary.totalScore != null ? `${summary.totalScore.toFixed(0)}/${summary.totalMaxMarks?.toFixed(0)}` : "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={cn("text-lg font-extrabold", g.text)}>{value}</p>
                  <p className={cn("text-xs opacity-60", g.text)}>{label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className={cn("text-center text-sm font-semibold italic opacity-80", g.text)}>
            🎉 Congratulations on this achievement!
          </p>
          <p className="text-xs text-white/60 font-medium mt-1">Powered by Al Madrasa Platform</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ParentResultsPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const ayId  = user?.defaultAcademicYearId ?? "";
  const madrasaName = user?.madrasaName ?? user?.name ?? "My Madrasa";
  const madrasaLogo = user?.madrasaLogo ?? null;

  // multi-child support
  const [selectedChildId, setSelectedChildId] = useState<string>(() => activeStudentId ?? ids[0] ?? "");
  const effectiveId = selectedChildId || ids[0] || "";

  const [exams,          setExams]          = useState<ExamRecord[]>([]);
  const [activeExamId,   setActiveExamId]   = useState("");
  const [results,        setResults]        = useState<ResultRecord[]>([]);
  const [summary,        setSummary]        = useState<ExamSummary | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [tab,            setTab]            = useState<Tab>("results");

  // ── Student info from accessibleStudents (no extra API call needed) ──────────
  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === effectiveId);

  // ── Load published exams ──────────────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    if (!cid || !token || !effectiveId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const examData = await getExams(cid, token, { accademicYearId: ayId || undefined, limit: 50 })
        .catch(() => ({ data: [] as ExamRecord[] }));
      const published = (examData.data ?? []).filter((e) => e.examStatus === "PUBLISHED");
      setExams(published);
      if (published[0] && !activeExamId) setActiveExamId(published[0].id);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [cid, token, effectiveId, ayId]);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ── Load results + summary when exam changes ──────────────────────────────────
  useEffect(() => {
    if (!cid || !token || !effectiveId || !activeExamId) return;
    setLoadingResults(true);
    setSummary(null);
    setResults([]);
    Promise.all([
      getResults(cid, token, { examId: activeExamId, studentId: effectiveId, limit: 50 })
        .catch(() => ({ data: [] as ResultRecord[] })),
      getSummaries(cid, token, { examId: activeExamId, studentId: effectiveId, limit: 1 })
        .catch(() => ({ data: [] as ExamSummary[] })),
    ]).then(([resData, sumData]) => {
      setResults(resData.data ?? []);
      setSummary(sumData.data?.[0] ?? null);
    }).finally(() => setLoadingResults(false));
  }, [cid, token, effectiveId, activeExamId]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const rank         = summary?.rank ?? null;
  const canRankCard  = rank !== null && rank <= 3;
  const activeExam   = exams.find((e) => e.id === activeExamId);
  const totalObtained = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax      = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const overallPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalObtained / totalMax) * 100 : 0);

  // ── Tab definitions ───────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: "results", label: "Results" },
    { key: "card",    label: "Result Card" },
    ...(canRankCard ? [{ key: "rank" as Tab, label: `Rank Poster ${RANK_MEDALS[rank! - 1]}` }] : []),
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Results"
        icon={Medal}
        back backHref="/parent"
        action={
          <button onClick={loadExams} className="p-2 rounded-xl bg-gray-100 text-gray-600 active:scale-95 transition-transform">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !effectiveId ? (
        <div className="text-center py-20 text-gray-400 text-sm">No children linked to this account</div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : (
        <div className="space-y-4 pb-24">

          {/* ── Multi-child selector ── */}
          {ids.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {students.map((s) => (
                <button key={s.id}
                  onClick={() => { setSelectedChildId(s.id); setActiveExamId(""); setResults([]); setSummary(null); }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border-2 transition-colors",
                    selectedChildId === s.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600",
                  )}>
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Student info strip ── */}
          {activeStudent && (
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex gap-1.5">
                  <span className="text-gray-400 shrink-0">Name</span>
                  <span className="font-semibold text-gray-900 truncate">{activeStudent.name}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-gray-400 shrink-0">Class</span>
                  <span className="font-semibold text-gray-900">{activeStudent.className ?? "—"}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-gray-400 shrink-0">Adm No</span>
                  <span className="font-semibold text-gray-900 font-mono">{activeStudent.adno}</span>
                </div>
                {activeExam && (
                  <div className="flex gap-1.5">
                    <span className="text-gray-400 shrink-0">Exam</span>
                    <span className="font-semibold text-gray-900 truncate">{activeExam.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Exam selector ── */}
          {exams.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              No published results yet
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {exams.map((ex) => (
                  <button key={ex.id} onClick={() => setActiveExamId(ex.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border",
                      activeExamId === ex.id
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-gray-200 text-gray-600",
                    )}>
                    {ex.name}
                  </button>
                ))}
              </div>

              {loadingResults ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No results for this exam</div>
              ) : (
                <>
                  {/* ── Summary cards ── */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-gray-100 rounded-xl px-3 py-3 text-center">
                      <p className={cn(
                        "text-xl font-black",
                        overallPct >= 80 ? "text-emerald-700" : overallPct >= 50 ? "text-amber-600" : "text-red-600",
                      )}>
                        {overallPct.toFixed(1)}%
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Percentage</p>
                    </div>
                    {rank !== null ? (
                      <div className="bg-white border border-gray-100 rounded-xl px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {rank <= 3 && <span className="text-lg">{RANK_MEDALS[rank - 1]}</span>}
                          <p className="text-xl font-black text-gray-900">#{rank}</p>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">Class Rank</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 rounded-xl px-3 py-3 text-center">
                        <p className="text-xl font-black text-gray-900">{results.length}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Subjects</p>
                      </div>
                    )}
                    {summary?.finalStatus ? (
                      <div className={cn("rounded-xl px-3 py-3 text-center border", STATUS_STYLE[summary.finalStatus])}>
                        <p className="text-sm font-black leading-tight">{summary.finalStatus}</p>
                        <p className="text-[11px] opacity-70 mt-0.5">Status</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 rounded-xl px-3 py-3 text-center">
                        <p className="text-xl font-black text-gray-900">
                          {totalObtained.toFixed(0)}<span className="text-xs text-gray-400">/{totalMax}</span>
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Total Score</p>
                      </div>
                    )}
                  </div>

                  {/* ── Tabs ── */}
                  <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
                    {tabs.map(({ key, label }) => (
                      <button key={key} onClick={() => setTab(key)}
                        className={cn(
                          "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                          tab === key
                            ? "text-emerald-700 border-emerald-600"
                            : "text-gray-500 border-transparent hover:text-gray-700",
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                      {/* ── Results table ── */}
                      {tab === "results" && (
                        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide">
                            <div className="px-4 py-2.5">Subject</div>
                            <div className="px-2 py-2.5 text-right w-12">Max</div>
                            <div className="px-2 py-2.5 text-right w-14">Marks</div>
                            <div className="px-2 py-2.5 text-center w-12">%</div>
                            <div className="px-2 py-2.5 text-center w-14">Grade</div>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {results.map((r) => {
                              const grade    = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                              const isPassed = r.isPassed ?? gradeIsPassed(grade);
                              const pct      = r.percentage ?? (r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0);
                              const gClass   = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";
                              return (
                                <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center">
                                  <div className="px-4 py-3">
                                    <p className="text-sm font-medium text-gray-900 leading-tight">{r.subject?.name ?? "Subject"}</p>
                                    <p className={cn("text-[10px] font-semibold mt-0.5", isPassed ? "text-emerald-600" : "text-red-500")}>
                                      {isPassed ? "PASS" : "FAIL"}
                                    </p>
                                  </div>
                                  <div className="px-2 py-3 w-12 text-right text-sm text-gray-400">{r.totalMarks}</div>
                                  <div className="px-2 py-3 w-14 text-right">
                                    <span className={cn("text-sm font-bold", isPassed ? "text-gray-900" : "text-red-600")}>{r.score}</span>
                                  </div>
                                  <div className="px-2 py-3 w-12 text-center text-xs text-gray-500">{pct.toFixed(0)}%</div>
                                  <div className="px-2 py-3 w-14 flex justify-center">
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", gClass)}>{grade}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Total row */}
                          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center border-t-2 border-emerald-100 bg-emerald-50/60">
                            <div className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900">TOTAL</p>
                              {summary?.totalGrade && (
                                <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                  {TOTAL_GRADE_LABELS[summary.totalGrade] ?? summary.totalGrade}
                                </p>
                              )}
                            </div>
                            <div className="px-2 py-3 w-12 text-right text-sm font-bold text-gray-700">{totalMax}</div>
                            <div className="px-2 py-3 w-14 text-right text-sm font-bold text-emerald-700">{totalObtained.toFixed(0)}</div>
                            <div className="px-2 py-3 w-12 text-center text-xs font-bold text-blue-700">{overallPct.toFixed(0)}%</div>
                            <div className="px-2 py-3 w-14 text-center text-xs text-gray-400">—</div>
                          </div>
                          {/* Status footer */}
                          {summary?.finalStatus && (
                            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Final Result:</span>
                              <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", STATUS_STYLE[summary.finalStatus])}>
                                {summary.finalStatus}
                              </span>
                              {rank && (
                                <span className="ml-auto flex items-center gap-1 text-sm font-bold text-gray-700">
                                  <Trophy className="w-4 h-4 text-amber-500" /> #{rank}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Result Card tab ── */}
                      {tab === "card" && activeExam && activeStudent && (
                        <ParentResultCard
                          studentName={activeStudent.name}
                          studentAdo={activeStudent.adno}
                          studentGender={activeStudent.gender ?? null}
                          studentClass={activeStudent.className ?? "—"}
                          results={results}
                          summary={summary}
                          exam={activeExam}
                          madrasaName={madrasaName}
                          madrasaLogo={madrasaLogo}
                        />
                      )}

                      {/* ── Rank poster tab ── */}
                      {tab === "rank" && canRankCard && summary && activeExam && activeStudent && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500 text-center">
                            🎉 Congratulations! Share this achievement poster.
                          </p>
                          <ParentRankCard
                            studentName={activeStudent.name}
                            studentAdo={activeStudent.adno}
                            studentGender={activeStudent.gender ?? null}
                            studentClass={activeStudent.className ?? "—"}
                            summary={summary}
                            exam={activeExam}
                            madrasaName={madrasaName}
                            madrasaLogo={madrasaLogo}
                          />
                        </div>
                      )}

                    </motion.div>
                  </AnimatePresence>

                  {/* Nudge for card tab */}
                  {tab === "results" && (
                    <button
                      onClick={() => setTab("card")}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-emerald-300 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      View & Share Result Card
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
