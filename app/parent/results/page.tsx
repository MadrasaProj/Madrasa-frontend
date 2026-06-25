import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getResults, getSummaries, getClassReport, type ResultRecord, type ExamSummary, type ClassReport, GRADE_COLORS, TOTAL_GRADE_LABELS, calcGradeFromConfig } from "@/lib/results-api";
import { useStudent, useStudentPhoto } from "@/lib/hooks/useStudentPhoto";
import { useStudentFullDataFromParent } from "@/lib/hooks/useStudentFullDataFromParent";
import { useRefreshParentStudents } from "@/lib/hooks/useRefreshParentStudents";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { downloadAsJPG, downloadAsPDF, shareAsJPG } from "@/lib/poster-utils";
import { Drawer } from "@/components/ui/Drawer";
import {
  Medal, Loader2, AlertCircle, RefreshCw, GraduationCap, Trophy,
  Download, Share2, FileText, ChevronDown, ArrowLeft, Printer, Calendar, Award, ClipboardList, Eye, FileBadge2
} from "lucide-react";

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
  PROMOTED: "bg-teal-100 text-teal-800 border-teal-300",
  WITHHELD: "bg-amber-100 text-amber-800 border-amber-300",
};

// ── Result Card (shareable poster) ────────────────────────────────────────────

function ParentResultCard({
  studentId, results, summary, exam, madrasaName, madrasaLogo,
}: {
  studentId: string;
  results: ResultRecord[];
  summary: ExamSummary | null;
  exam: ExamRecord;
  madrasaName: string;
  madrasaLogo?: string | null;
}) {
  const { student: activeStudent } = useStudentFullDataFromParent(studentId);
  const studentName   = activeStudent?.name ?? "Student";
  const studentAdo    = activeStudent?.adno ?? "—";
  const studentGender = activeStudent?.gender ?? null;
  const studentClass  = activeStudent?.class?.name ?? "—";
  const studentPhoto  = activeStudent?.photoUrl ?? activeStudent?.photo ?? null;
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | "share" | null>(null);

  const rank        = summary?.rank ?? null;
  const headerGrad  = rank && rank <= 3 ? RANK_HEADER[rank].grad : DEFAULT_GRAD;
  const totalScore  = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax    = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const totalPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalScore / totalMax) * 100 : 0);
  const finalStatus = summary?.finalStatus ?? null;
  const totalGrade  = summary?.totalGrade  ?? null;

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
    <div className="space-y-5">
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
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-gray-200 flex items-center justify-center shrink-0">
        
            {studentPhoto ? (
              <img src={studentPhoto} alt={studentName} className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <span className="text-xl font-extrabold text-white tracking-tight">
                {studentName?.trim()?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
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
              <td className="px-3 py-3 text-right text-emerald-700 font-extrabold">{totalScore.toFixed(0)}</td>
              <td className="px-4 py-3 text-center text-emerald-700 font-extrabold">{totalPct.toFixed(1)}%</td>
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

      {/* Bottom action group — prominent button cluster */}
      <div className="w-full max-w-sm mx-auto space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-700 text-center">
          Save & Share
        </p>
        <div className="flex mt-10 items-stretch gap-1.5 transition-shadow duration-200">
          <button
            onClick={() => run("share")}
            disabled={!!exporting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all duration-200 ease-out shadow-sm hover:shadow active:scale-[0.98]"
          >
            {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share Result
          </button>
          <button
            onClick={() => run("jpg")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98]"
            title="Download as JPG"
          >
            {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            JPG
          </button>
          <button
            onClick={() => run("pdf")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98]"
            title="Download as PDF"
          >
            {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Parent Rank Card (shareable poster) ───────────────────────────────────────

function ParentRankCard({
  studentId, summary, exam, madrasaName, madrasaLogo,
}: {
  studentId: string;
  summary: ExamSummary;
  exam: ExamRecord;
  madrasaName: string;
  madrasaLogo?: string | null;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | "share" | null>(null);
  const activeStudent = useStudent(studentId);
  const studentName   = activeStudent?.name ?? "Student";
  const studentAdo    = activeStudent?.adno ?? "—";
  const studentGender = activeStudent?.gender ?? null;
  const studentClass  = activeStudent?.className ?? "—";
  const studentPhoto  = useStudentPhoto(studentId);

  const rank = summary.rank ?? 1;
  const medal = RANK_MEDALS[rank - 1] ?? "🏆";
  const bgGrad = rank === 1 ? "from-yellow-400 via-amber-300 to-yellow-500" : rank === 2 ? "from-slate-300 via-slate-200 to-slate-400" : "from-amber-600 via-orange-400 to-amber-700";
  const badgeBg = rank === 1 ? "bg-yellow-800 text-yellow-100" : rank === 2 ? "bg-slate-700 text-slate-100" : "bg-amber-900 text-amber-100";
  const textTitle = rank === 1 ? "text-yellow-950" : rank === 2 ? "text-slate-950" : "text-amber-950";

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
      <div className="flex items-center gap-2 flex-wrap">
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
            <p className={cn("text-[10px] font-extrabold tracking-widest uppercase opacity-75", textTitle)}>{madrasaName}</p>
            <p className={cn("text-xs font-bold mt-0.5 opacity-90", textTitle)}>{exam.name}</p>
          </div>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/30 backdrop-blur-md shadow-inner">
            <span className="text-5xl leading-none">{medal}</span>
          </div>

          <div className="space-y-1">
            <span className={cn("inline-block text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider", badgeBg)}>
              Rank #{rank}
            </span>
            <h3 className={cn("text-xl font-extrabold tracking-tight pt-1", textTitle)}>CONGRATULATIONS</h3>
          </div>

          {/* Student photo & info */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-white/40 max-w-xs mx-auto text-left shadow-md">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-white flex items-center justify-center shrink-0">
              {studentPhoto ? (
                <img src={studentPhoto} alt={studentName} className="w-full h-full object-cover" crossOrigin="anonymous" />
              ) : (
                <span className="text-lg font-extrabold text-white tracking-tight">
                  {studentName?.trim()?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">{studentName}</p>
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
  useRefreshParentStudents();
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
  const [classReport,    setClassReport]    = useState<ClassReport | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Drawer state
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [cardOpen,     setCardOpen]     = useState(false);
  const [posterOpen,   setPosterOpen]   = useState(false);

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
    setClassReport(null);
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

  // ── Load class report (class-level stats) when exam changes ────────────────────
  useEffect(() => {
    const ex = exams.find((e) => e.id === activeExamId);
    if (!cid || !token || !activeExamId || !ex?.classId) { setClassReport(null); return; }
    let cancelled = false;
    getClassReport(cid, token, { examId: activeExamId, classId: ex.classId })
      .then((r) => { if (!cancelled) setClassReport(r); })
      .catch(() => { if (!cancelled) setClassReport(null); });
    return () => { cancelled = true; };
  }, [cid, token, activeExamId, exams]);

  const activeExam   = exams.find((e) => e.id === activeExamId);
  const rank         = summary?.rank ?? null;
  const canRankCard  = rank !== null && rank <= 3;
  const totalObtained = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax      = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const overallPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalObtained / totalMax) * 100 : 0);

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
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight mt-0.5">Exam Results</h1>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-6 w-40 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-24 rounded-2xl" />
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-xl" />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          </div>
        ) : !effectiveId ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl p-6">
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

            {/* Top Summary — simple elegant view */}
            {activeExam && activeStudent && (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-5 border-b-2 border-gray-200">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                      Examination Result
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      · {activeExam.classId ? "Class Level" : "Madrasa Level"}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
                    {activeExam.name}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    For <span className="text-gray-900 font-semibold">{activeStudent.name}</span>
                    <span className="text-gray-300 mx-1.5">·</span>
                    <span>{activeStudent.className ?? "Class"}</span>
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500 pt-1">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Exam {fmt(activeExam.startDate)} – {fmt(activeExam.endDate)}</span>
                    <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-gray-400" /> Mark Entry {fmt(activeExam.markEntryLastDate)}</span>
                    <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-gray-400" /> Published {fmt(activeExam.publishedDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-end shrink-0 print:hidden">
                  <div className="relative">
                    <select
                      value={activeExamId}
                      onChange={(e) => setActiveExamId(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-400 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={loadExams} className="p-2 text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg transition-colors bg-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action bar — opens drawers */}
            {activeExam && activeStudent && results.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <button
                  onClick={() => setOverviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Overview
                </button>
                <button
                  onClick={() => setCardOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <FileBadge2 className="w-3.5 h-3.5" /> Result Card
                </button>
                {canRankCard && (
                  <button
                    onClick={() => setPosterOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Rank Poster
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Mark List
                </button>
              </div>
            )}

            {/* Marks — always shown inline on the page */}
            {exams.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl p-6">
                <Medal className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900">No published results yet</p>
                <p className="text-xs text-gray-400 mt-1">Once examination results are published, they will appear here.</p>
              </div>
            ) : loadingResults ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No marks records available for this exam.</div>
            ) : (
              <div className="space-y-5">
                {/* Hero summary — prominent boxes for each metric */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
                  <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <p className="text-[10px] text-emerald-700 uppercase tracking-[0.15em] font-bold">Percentage</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none tabular-nums tracking-tight">
                      {overallPct.toFixed(2)}<span className="text-base sm:text-lg text-emerald-600/70 font-bold">%</span>
                    </p>
                  </div>
                  <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <p className="text-[10px] text-emerald-700 uppercase tracking-[0.15em] font-bold">Grade</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none tracking-tight">
                      {summary?.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : calcFallbackGrade(totalObtained, totalMax)}
                    </p>
                  </div>
                  {rank && (
                    <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                      <p className="text-[10px] text-emerald-700 uppercase tracking-[0.15em] font-bold">Class Rank</p>
                      <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none tabular-nums tracking-tight">
                        <span className="text-base sm:text-lg text-emerald-600/70 font-bold">#</span>{rank}
                      </p>
                    </div>
                  )}
                  {summary?.finalStatus && (
                    <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                      <p className="text-[10px] text-emerald-700 uppercase tracking-[0.15em] font-bold">Status</p>
                      <p className={cn("mt-2 text-xl sm:text-2xl font-extrabold leading-none uppercase tracking-tight",
                        summary.finalStatus === "PASSED" || summary.finalStatus === "PROMOTED" ? "text-emerald-700" : "text-rose-600")}>
                        {summary.finalStatus}
                      </p>
                    </div>
                  )}
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Subjects</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                      {results.length}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Marks</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                      {totalObtained.toFixed(0)}<span className="text-base sm:text-lg text-gray-400 font-bold">/{totalMax}</span>
                    </p>
                  </div>
                </div>

                {/* Class-level stats row — average, highest, lowest, pass rate, total students */}
                {(() => {
                  const passedCount = results.filter((r) => {
                    const g = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                    return r.isPassed ?? gradeIsPassed(g);
                  }).length;
                  const passRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;
                  const stats = classReport?.stats;
                  const aboveAvg = stats && overallPct > stats.classAverage;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Class Average</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                          {stats ? <>{stats.classAverage.toFixed(2)}<span className="text-base sm:text-lg text-gray-400 font-bold">%</span></> : "—"}
                        </p>
                        {stats && (
                          <p className={cn("mt-1.5 text-[10px] font-bold uppercase tracking-wider", aboveAvg ? "text-emerald-600" : "text-amber-600")}>
                            {aboveAvg ? "▲ Above average" : "▼ Below average"}
                          </p>
                        )}
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Class Highest</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                          {stats && classReport?.students?.length
                            ? <>{Math.max(...classReport.students.map((s) => s.summary.totalPercentage ?? 0)).toFixed(2)}<span className="text-base sm:text-lg text-gray-400 font-bold">%</span></>
                            : "—"}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Class Lowest</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                          {stats && classReport?.students?.length
                            ? <>{Math.min(...classReport.students.map((s) => s.summary.totalPercentage ?? 0)).toFixed(2)}<span className="text-base sm:text-lg text-gray-400 font-bold">%</span></>
                            : "—"}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Pass Rate</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                          {passRate.toFixed(0)}<span className="text-base sm:text-lg text-gray-400 font-bold">%</span>
                        </p>
                        <p className="mt-1.5 text-[10px] text-gray-400 font-semibold tabular-nums">
                          {passedCount}/{results.length} subjects
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Class Size</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none tabular-nums tracking-tight">
                          {stats?.totalStudents ?? "—"}
                        </p>
                        {stats && (
                          <p className="mt-1.5 text-[10px] text-gray-400 font-semibold">
                            {stats.passedCount} passed · {stats.failedCount} failed
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Subject wise marks — simple elegant table */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="px-5 py-3.5 border-b border-gray-100 print:hidden">
                    <h3 className="font-semibold text-gray-900 text-sm">Subject Wise Marks</h3>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-5 py-2.5 w-10 text-center text-gray-400 font-normal">#</th>
                          <th className="px-3 py-2.5 font-normal">Subject</th>
                          <th className="px-3 py-2.5 w-28 text-center font-normal">Full</th>
                          <th className="px-3 py-2.5 w-28 text-center font-normal">Pass</th>
                          <th className="px-3 py-2.5 w-32 text-center font-normal">Obtained</th>
                          <th className="px-5 py-2.5 w-24 text-center font-normal">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, idx) => {
                          const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                          const isPassed = r.isPassed ?? gradeIsPassed(grade);
                          const gClass = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";

                          return (
                            <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40 transition-colors">
                              <td className="px-5 py-2.5 text-center text-gray-300 text-xs tabular-nums">{idx + 1}</td>
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-gray-800 leading-tight">{r.subject?.name ?? "Subject"}</p>
                              </td>
                              <td className="px-3 py-2.5 text-center text-gray-500 tabular-nums">{r.totalMarks}</td>
                              <td className="px-3 py-2.5 text-center text-gray-500 tabular-nums">{activeExam?.passMarks ?? 40}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn("font-semibold tabular-nums", isPassed ? "text-gray-900" : "text-rose-600")}>
                                  {r.score}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded border w-9", gClass)}>
                                  {grade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 text-gray-900 bg-gray-50/40">
                          <td className="px-5 py-2.5 text-center text-gray-300 text-xs">—</td>
                          <td className="px-3 py-2.5 font-semibold text-sm">Total</td>
                          <td className="px-3 py-2.5 text-center text-sm tabular-nums">{totalMax}</td>
                          <td className="px-3 py-2.5 text-center text-gray-300 text-sm">—</td>
                          <td className="px-3 py-2.5 text-center text-emerald-700 font-semibold text-sm tabular-nums">{totalObtained.toFixed(0)}</td>
                          <td className="px-5 py-2.5 text-center text-sm">
                            <span className="text-emerald-700 font-semibold tabular-nums">{overallPct.toFixed(2)}%</span>
                            <span className="ml-1 text-gray-500 font-normal text-xs">({summary?.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : calcFallbackGrade(totalObtained, totalMax)})</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile List View */}
                  <div className="block sm:hidden divide-y divide-gray-100">
                    {results.map((r, idx) => {
                      const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                      const isPassed = r.isPassed ?? gradeIsPassed(grade);
                      const gClass = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";

                      return (
                        <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 text-sm leading-tight">{r.subject?.name ?? "Subject"}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">Max {r.totalMarks} · Pass {activeExam?.passMarks ?? 40}</p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={cn("text-base font-semibold tabular-nums", isPassed ? "text-gray-900" : "text-rose-600")}>
                              {r.score}
                            </span>
                            <span className={cn("inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border w-8 text-center", gClass)}>
                              {grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total summary on mobile */}
                    <div className="px-5 py-3 bg-gray-50/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">Total · {results.length} subjects</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{totalObtained.toFixed(0)}/{totalMax}</span>
                        <span className="ml-2 text-xs font-semibold text-emerald-700 tabular-nums">{overallPct.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Overview drawer — date details, exam rules, subjects (responsive: right on desktop, bottom on mobile) */}
        <Drawer
          open={overviewOpen}
          onOpenChange={setOverviewOpen}
          side="responsive"
          title={activeExam ? `Overview · ${activeExam.name}` : "Overview"}
          description={activeStudent ? `For ${activeStudent.name} · ${activeStudent.className ?? "Class"}` : undefined}
        >
          <div className="p-5 space-y-5">
            {activeExam && (
              <>
                <section className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-700">Date Details</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Exam Period</span>
                      <span className="font-semibold text-gray-900 text-right">{fmt(activeExam.startDate)} – {fmt(activeExam.endDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Mark Entry Deadline</span>
                      <span className="font-semibold text-gray-900 text-right">{fmt(activeExam.markEntryLastDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Published On</span>
                      <span className="font-semibold text-gray-900 text-right">{fmt(activeExam.publishedDate)}</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-700">Exam Rules</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Maximum Marks</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{activeExam.maxMarks ?? 100}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Pass Percentage</span>
                      <span className="font-semibold text-gray-900 tabular-nums">40%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Academic Year</span>
                      <span className="font-semibold text-gray-900 text-right">{activeExam.accademicYear?.name ?? "Current"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Level</span>
                      <span className="font-semibold text-gray-900">{activeExam.classId ? "Class Level" : "Madrasa Level"}</span>
                    </div>
                  </div>
                </section>

                {classReport?.stats && (() => {
                  const highest = classReport.students?.length
                    ? Math.max(...classReport.students.map((s) => s.summary.totalPercentage ?? 0))
                    : null;
                  const lowest = classReport.students?.length
                    ? Math.min(...classReport.students.map((s) => s.summary.totalPercentage ?? 0))
                    : null;
                  return (
                    <section className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-700">Class Statistics</h4>
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="text-gray-500">Class Average</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{classReport.stats.classAverage.toFixed(2)}%</span>
                        </div>
                        {highest !== null && (
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                            <span className="text-gray-500">Class Highest</span>
                            <span className="font-semibold text-gray-900 tabular-nums">{highest.toFixed(2)}%</span>
                          </div>
                        )}
                        {lowest !== null && (
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                            <span className="text-gray-500">Class Lowest</span>
                            <span className="font-semibold text-gray-900 tabular-nums">{lowest.toFixed(2)}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="text-gray-500">Total Students</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{classReport.stats.totalStudents}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="text-gray-500">Pass / Fail</span>
                          <span className="font-semibold text-gray-900 tabular-nums">
                            <span className="text-emerald-700">{classReport.stats.passedCount}</span>
                            <span className="text-gray-300 mx-1">/</span>
                            <span className="text-rose-600">{classReport.stats.failedCount}</span>
                          </span>
                        </div>
                      </div>
                    </section>
                  );
                })()}
              </>
            )}

            <section className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-700">Subjects ({results.length})</h4>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {results.map((r, idx) => {
                  const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                  const gClass = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center tabular-nums">{idx + 1}</span>
                        <p className="font-medium text-gray-800 truncate">{r.subject?.name ?? "Subject"}</p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] text-gray-500 tabular-nums">{r.score}/{r.totalMarks}</span>
                        <span className={cn("inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border w-8 text-center", gClass)}>
                          {grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </Drawer>

        {/* Result Card drawer — responsive: right on desktop, bottom on mobile */}
        <Drawer
          open={cardOpen}
          onOpenChange={setCardOpen}
          side="responsive"
          title="Result Card"
          description="Share or download a beautifully formatted result card"
        >
          <div className="p-5 sm:p-6">
             {activeExam && activeStudent && (
              <ParentResultCard
                studentId={activeStudent.id}
                results={results}
                summary={summary}
                exam={activeExam}
                madrasaName={madrasaName}
                madrasaLogo={madrasaLogo}
              />
            )}
          </div>
        </Drawer>

        {/* Rank Poster drawer — responsive: right on desktop, bottom on mobile */}
        <Drawer
          open={posterOpen}
          onOpenChange={setPosterOpen}
          side="responsive"
          title="Rank Poster"
          description="Celebrate your child's achievement"
        >
          <div className="p-5 sm:p-6">
            {canRankCard && summary && activeExam && activeStudent && (
              <ParentRankCard
                studentId={activeStudent.id}
                summary={summary}
                exam={activeExam}
                madrasaName={madrasaName}
                madrasaLogo={madrasaLogo}
              />
            )}
          </div>
        </Drawer>
      </div>
    </DashboardLayout>
  );
}
