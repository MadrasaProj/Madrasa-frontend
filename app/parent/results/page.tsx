import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getResults, getSummaries, type ResultRecord, type ExamSummary, GRADE_COLORS, TOTAL_GRADE_LABELS, calcGradeFromConfig } from "@/lib/results-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { downloadAsJPG, downloadAsPDF, shareAsJPG } from "@/lib/poster-utils";
import {
  Medal, Loader2, AlertCircle, RefreshCw, GraduationCap, Trophy,
  Download, Share2, Upload, X, FileText, ChevronRight, ArrowLeft, Printer, Calendar, Award, BookOpen, User, ClipboardList
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

const STATUS_STYLE: Record<string, string> = {
  PASSED:   "bg-emerald-100 text-emerald-800 border-emerald-300",
  FAILED:   "bg-red-100 text-red-800 border-red-300",
  PROMOTED: "bg-blue-100 text-blue-800 border-blue-300",
  WITHHELD: "bg-amber-100 text-amber-800 border-amber-300",
};

type Tab = "overview" | "marks" | "subjects" | "share-card" | "share-poster";

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
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap bg-white p-3 border border-gray-100 rounded-2xl shadow-xs">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => run("jpg")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "jpg" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          JPG
        </button>
        <button onClick={() => run("pdf")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          PDF
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors ml-auto">
          {exporting === "share" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
          Share Result
        </button>
      </div>

      {/* Poster */}
      <div ref={posterRef}
        className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 w-full max-w-sm mx-auto"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className={cn("bg-gradient-to-br text-white text-center px-6 py-6 relative overflow-hidden", headerGrad)}>
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
              <th className="px-4 py-2.5 text-left font-bold text-gray-400 uppercase">Subject</th>
              <th className="px-3 py-2.5 text-right font-bold text-gray-400 uppercase w-14">Max</th>
              <th className="px-3 py-2.5 text-right font-bold text-gray-400 uppercase w-14">Marks</th>
              <th className="px-4 py-2.5 text-center font-bold text-gray-400 uppercase w-14">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((r) => {
              const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
              const isPassed = r.isPassed ?? gradeIsPassed(grade);
              return (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{r.subject?.name ?? "Subject"}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400 font-semibold">{r.totalMarks}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-gray-900">{r.score}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-extrabold border", GRADE_COLORS[grade] ?? "bg-gray-50 text-gray-600 border-gray-200")}>
                      {grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50/50 border-t-2 border-emerald-100 font-bold text-gray-900">
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-3 py-3 text-right text-gray-500">{totalMax}</td>
              <td className="px-3 py-3 text-right text-emerald-700 font-black">{totalScore.toFixed(0)}</td>
              <td className="px-4 py-3 text-center text-emerald-700 font-black">{totalPct.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>

        {/* Status banner */}
        {finalStatus && (
          <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Result Status</span>
            <span className={cn("px-3 py-1 rounded-full font-bold border uppercase", STATUS_STYLE[finalStatus])}>
              {finalStatus}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Parent Rank Card (shareable poster) ───────────────────────────────────────

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
  const [exporting, setExporting] = useState<"jpg" | "pdf" | "share" | null>(null);

  const rank = summary.rank ?? 1;
  const medal = RANK_MEDALS[rank - 1] ?? "🏆";
  const bgGrad = rank === 1 ? "from-yellow-400 via-amber-300 to-yellow-500" : rank === 2 ? "from-slate-300 via-slate-200 to-slate-400" : "from-amber-600 via-orange-400 to-amber-700";
  const badgeBg = rank === 1 ? "bg-yellow-800 text-yellow-100" : rank === 2 ? "bg-slate-700 text-slate-100" : "bg-amber-900 text-amber-100";
  const textTitle = rank === 1 ? "text-yellow-950" : rank === 2 ? "text-slate-950" : "text-amber-950";

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const stem = `rank-${studentName}`.replace(/\s+/g, "-");

  const run = async (type: "jpg" | "pdf" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg")   await downloadAsJPG(posterRef.current, stem);
      if (type === "pdf")   await downloadAsPDF(posterRef.current, stem);
      if (type === "share") await shareAsJPG(
        posterRef.current, `${stem}.jpg`,
        `Rank Poster · ${studentName}`,
        `${studentName} achieved Rank #${rank} in ${exam.name}!`,
      );
    } catch (err) {
      console.error("Rank card export failed", err);
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap bg-white p-3 border border-gray-100 rounded-2xl shadow-xs">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => run("jpg")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "jpg" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          JPG
        </button>
        <button onClick={() => run("pdf")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          PDF
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors ml-auto">
          {exporting === "share" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
          Share Poster
        </button>
      </div>

      {/* Poster design */}
      <div ref={posterRef}
        className={cn("bg-gradient-to-br p-6 rounded-3xl text-center shadow-2xl w-full max-w-sm mx-auto relative overflow-hidden", bgGrad)}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div>
            {madrasaLogo && (
              <img src={madrasaLogo} alt="" className="h-10 w-auto mx-auto mb-1.5 object-contain" crossOrigin="anonymous" />
            )}
            <p className={cn("text-[10px] font-black tracking-widest uppercase opacity-75", textTitle)}>{madrasaName}</p>
            <p className={cn("text-xs font-bold mt-0.5 opacity-90", textTitle)}>{exam.name}</p>
          </div>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/30 backdrop-blur-md shadow-inner">
            <span className="text-5xl leading-none">{medal}</span>
          </div>

          <div className="space-y-1">
            <span className={cn("inline-block text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider", badgeBg)}>
              Rank #{rank}
            </span>
            <h3 className={cn("text-xl font-black tracking-tight pt-1", textTitle)}>CONGRATULATIONS</h3>
          </div>

          {/* Student photo & info */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-white/40 max-w-xs mx-auto text-left shadow-md">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-white flex items-center justify-center shrink-0">
              {photo
                ? <img src={photo} alt={studentName} className="w-full h-full object-cover" />
                : <span className="text-2xl">{studentGender === "FEMALE" ? "👩" : "👨"}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm leading-tight truncate">{studentName}</p>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Adm No: <span className="font-mono text-gray-700">{studentAdo}</span></p>
              <p className="text-[10px] text-gray-500 font-semibold">Class: <span className="text-gray-700">{studentClass}</span></p>
            </div>
          </div>

          <div className={cn("text-[9px] font-bold opacity-60", textTitle)}>
            Percentage: {summary.totalPercentage?.toFixed(2)}% · Total Score: {summary.totalScore}/{summary.totalMaxMarks}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

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
  const [tab,            setTab]            = useState<Tab>("marks");

  // Load child details
  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === effectiveId);

  // ── Load published exams ──────────────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    if (!cid || !token || !effectiveId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const examData = await getExams(cid, token, { accademicYearId: ayId || undefined, studentId: effectiveId, limit: 50 })
        .catch(() => ({ data: [] as ExamRecord[] }));
      const published = (examData.data ?? []).filter((e) => e.examStatus === "PUBLISHED");
      setExams(published);
      if (published[0] && !activeExamId) setActiveExamId(published[0].id);
    } catch (e: any) {
      setError(e.message ?? "Failed to load exams");
    }
    setLoading(false);
  }, [cid, token, effectiveId, ayId, activeExamId]);

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

  const activeExam   = exams.find((e) => e.id === activeExamId);
  const rank         = summary?.rank ?? null;
  const canRankCard  = rank !== null && rank <= 3;
  const totalObtained = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax      = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const overallPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalObtained / totalMax) * 100 : 0);

  // ── Tab definitions ───────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: "marks",    label: "Marks" },
    { key: "overview", label: "Overview" },
    { key: "subjects", label: "Subjects" },
    { key: "share-card", label: "Result Card" },
    ...(canRankCard ? [{ key: "share-poster" as Tab, label: `Rank Poster` }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">

        {/* Breadcrumb Header */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => window.history.back()}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <span>Exams</span>
              <span>/</span>
              <span>{activeExam?.name ?? "Details"}</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">Exam Results</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !effectiveId ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-6">
            <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No children linked to this account</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        ) : (
          <div className="space-y-6">

            {/* Child switcher */}
            {ids.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
                {students.map((s) => (
                  <button key={s.id}
                    onClick={() => { setSelectedChildId(s.id); setActiveExamId(""); setResults([]); setSummary(null); }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border",
                      selectedChildId === s.id
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                    )}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* Top Summary Card (Screenshot 4) */}
            {activeExam && activeStudent && (
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 shadow-inner">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black text-gray-900 leading-tight">{activeExam.name}</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                        {activeExam.classId ? "Class Level" : "Madrasa Level"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      For: <strong className="text-gray-800 font-bold">{activeStudent.name}</strong> ({activeStudent.className ?? "Class"})
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 pt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Exam: {fmt(activeExam.startDate)} - {fmt(activeExam.endDate)}</span>
                      <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Mark Entry: {fmt(activeExam.markEntryLastDate)}</span>
                      <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Publish: {fmt(activeExam.publishedDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 print:hidden">
                  <select
                    value={activeExamId}
                    onChange={(e) => setActiveExamId(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                  >
                    {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  </select>
                  <button onClick={loadExams} className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors bg-white">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            {/* Content Tabs */}
            {exams.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6">
                <Medal className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900">No published results yet</p>
                <p className="text-xs text-gray-400 mt-1">Once examination results are published, they will appear here.</p>
              </div>
            ) : loadingResults ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No marks records available for this exam.</div>
            ) : (
              <div className="space-y-6">

                {/* Tab selectors bar */}
                <div className="border-b border-gray-100 flex gap-1 overflow-x-auto no-scrollbar py-0.5 print:hidden">
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={cn(
                        "px-4 py-2 text-xs lg:text-sm font-semibold rounded-t-xl transition-colors shrink-0 border-b-2 -mb-px",
                        tab === key
                          ? "border-emerald-600 text-emerald-600 font-bold"
                          : "border-transparent text-gray-500 hover:text-gray-900"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                    {/* OVERVIEW TAB */}
                    {tab === "overview" && activeExam && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-100 rounded-3xl p-5 space-y-3 shadow-xs">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2"><Calendar className="w-4 h-4 text-emerald-600" /> Date Details</h3>
                          <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
                            <div>
                              <p className="text-gray-400">Exam Period</p>
                              <p className="font-bold text-gray-800">{fmt(activeExam.startDate)} – {fmt(activeExam.endDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Mark Entry Deadline</p>
                              <p className="font-bold text-gray-800">{fmt(activeExam.markEntryLastDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Published On</p>
                              <p className="font-bold text-gray-800">{fmt(activeExam.publishedDate)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-3xl p-5 space-y-3 shadow-xs">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2"><Trophy className="w-4 h-4 text-emerald-600" /> Exam Rules</h3>
                          <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
                            <div>
                              <p className="text-gray-400">Maximum Marks</p>
                              <p className="font-bold text-gray-800">{activeExam.maxMarks ?? 100}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Pass Percentage</p>
                              <p className="font-bold text-gray-800">40%</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Academic Year</p>
                              <p className="font-bold text-gray-800">{activeExam.accademicYear?.name ?? "Current"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MARKS TAB (Screenshot 4 design) */}
                    {tab === "marks" && (
                      <div className="space-y-6">
                        
                        {/* Summary metrics row of cards (Screenshot 4) */}
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                          {[
                            { label: "Total Subjects", value: results.length, color: "text-gray-900" },
                            { label: "Total Marks", value: totalMax, color: "text-gray-900" },
                            { label: "Obtained Marks", value: totalObtained.toFixed(0), color: "text-emerald-700" },
                            { label: "Percentage", value: `${overallPct.toFixed(2)}%`, color: "text-emerald-700" },
                            { label: "Grade", value: summary?.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : calcFallbackGrade(totalObtained, totalMax), color: "text-blue-700" },
                            { label: "Rank in Class", value: rank ? `#${rank}` : "—", color: "text-indigo-700" }
                          ].map((m, idx) => (
                            <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-xs flex flex-col justify-center">
                              <p className={cn("text-lg font-black tracking-tight", m.color)}>{m.value}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">{m.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Subject wise marks table */}
                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xs">
                          {/* Table header with Download button */}
                          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 print:hidden">
                            <h3 className="font-bold text-gray-900 text-sm">Subject Wise Marks</h3>
                            <button
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" /> Download Mark List
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs md:text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  <th className="px-6 py-3.5 w-12 text-center">#</th>
                                  <th className="px-4 py-3.5">Subject</th>
                                  <th className="px-4 py-3.5 w-32 text-center">Full Marks</th>
                                  <th className="px-4 py-3.5 w-32 text-center">Pass Marks</th>
                                  <th className="px-4 py-3.5 w-40 text-center">Obtained Marks</th>
                                  <th className="px-6 py-3.5 w-32 text-center">Grade</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {results.map((r, idx) => {
                                  const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                                  const isPassed = r.isPassed ?? gradeIsPassed(grade);
                                  const pct = r.percentage ?? (r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0);
                                  const gClass = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";

                                  return (
                                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="px-6 py-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                                      <td className="px-4 py-3">
                                        <p className="font-bold text-gray-900 leading-tight">{r.subject?.name ?? "Subject"}</p>
                                        <span className={cn("text-[9px] font-bold tracking-wider uppercase", isPassed ? "text-emerald-600" : "text-rose-600")}>
                                          {isPassed ? "Pass" : "Fail"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center text-gray-500 font-semibold">{r.totalMarks}</td>
                                      <td className="px-4 py-3 text-center text-gray-500 font-semibold">{activeExam?.passMarks ?? 40}</td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={cn("font-bold text-sm", isPassed ? "text-gray-900" : "text-rose-600")}>
                                          {r.score}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3 text-center">
                                        <span className={cn("inline-block text-[10px] font-black px-2 py-0.5 rounded border text-center shrink-0 w-10", gClass)}>
                                          {grade}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-emerald-50/40 border-t-2 border-emerald-100 text-gray-900 font-bold">
                                  <td className="px-6 py-3 text-center">—</td>
                                  <td className="px-4 py-3">Total</td>
                                  <td className="px-4 py-3 text-center">{totalMax}</td>
                                  <td className="px-4 py-3 text-center">—</td>
                                  <td className="px-4 py-3 text-center text-emerald-700 font-black text-sm">{totalObtained.toFixed(0)}</td>
                                  <td className="px-6 py-3 text-center text-emerald-700 font-black text-sm">{overallPct.toFixed(2)}% ({summary?.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : calcFallbackGrade(totalObtained, totalMax)})</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBJECTS TAB */}
                    {tab === "subjects" && (
                      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs">
                        <h3 className="font-bold text-gray-900 text-sm border-b pb-2 mb-3">Course Curriculum</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {results.map((r, idx) => (
                            <div key={r.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-gray-800">{r.subject?.name ?? "Subject"}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Maximum Marks: {r.totalMarks}</p>
                              </div>
                              <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SHARE CARD TAB */}
                    {tab === "share-card" && activeExam && activeStudent && (
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

                    {/* SHARE POSTER TAB */}
                    {tab === "share-poster" && canRankCard && summary && activeExam && activeStudent && (
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
                    )}

                  </motion.div>
                </AnimatePresence>

              </div>
            )}

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
