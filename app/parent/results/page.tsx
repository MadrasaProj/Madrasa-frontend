import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ExamRecord } from "@/lib/exams-api";
import type { ResultRecord, ExamSummary, ClassReport } from "@/lib/results-api";
import { getResults, getSummaries, GRADE_COLORS, TOTAL_GRADE_LABELS } from "@/lib/results-api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useStudent, useStudentPhoto } from "@/lib/hooks/useStudentPhoto";
import { useStudentFullDataFromParent } from "@/lib/hooks/useStudentFullDataFromParent";
import { useRefreshParentStudents } from "@/lib/hooks/useRefreshParentStudents";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { downloadAsJPG, downloadAsPDF, shareAsJPG, downloadAsPNG } from "@/lib/poster-utils";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, RadialBar, RadialBarChart, XAxis, YAxis } from "recharts";
import {
  Medal, Loader2, AlertCircle, RefreshCw, GraduationCap, Trophy,
  Download, Share2, FileText, ChevronRight, Printer, Calendar, Award, FileBadge2, BookOpen, Users, TrendingUp
} from "lucide-react";
import { useExams, useResults, useClassReport } from "@/lib/queries";

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

const resultChartConfig = {
  score: { label: "Score", color: "var(--primary)" },
  rate: { label: "Pass rate", color: "#0d9488" },
} satisfies ChartConfig;

function HalfRadialChart({ value, label, color }: { value: number; label: string; color: string }) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="relative h-16 w-24" role="img" aria-label={`${label}: ${safeValue.toFixed(0)}%`}>
      <ChartContainer config={resultChartConfig} className="!aspect-auto h-16 w-24">
        <RadialBarChart
          data={[{ value: safeValue, fill: color }]}
          startAngle={180}
          endAngle={0}
          cx="50%"
          cy="95%"
          innerRadius={30}
          outerRadius={40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={5} isAnimationActive={false} />
        </RadialBarChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-sm font-semibold tabular-nums text-gray-950">{safeValue.toFixed(0)}%</span>
    </div>
  );
}

const RANK_HEADER: Record<number, { grad: string; badge: string }> = {
  1: { grad: "from-yellow-500 via-amber-400 to-yellow-600", badge: "bg-yellow-700" },
  2: { grad: "from-slate-400 via-slate-300 to-slate-500",   badge: "bg-slate-600"  },
  3: { grad: "from-amber-600 via-orange-500 to-amber-700",  badge: "bg-amber-800"  },
};
const DEFAULT_GRAD = "from-primary-800 via-primary-700 to-teal-700";
const RANK_MEDALS  = ["🥇", "🥈", "🥉"];

const STATUS_STYLE: Record<string, string> = {
  PASSED:   "bg-primary-100 text-primary-800 border-primary-300",
  FAILED:   "bg-red-100 text-red-800 border-red-300",
  PROMOTED: "bg-teal-100 text-teal-800 border-teal-300",
  WITHHELD: "bg-amber-100 text-amber-800 border-amber-300",
};

// ── Result Card (shareable poster) ────────────────────────────────────────────

function ParentResultCard({
  studentId, results, summary, exam, madrasaName, madrasaLogo,
  classAverage, classHighest, classLowest, classSize,
}: {
  studentId: string;
  results: ResultRecord[];
  summary: ExamSummary | null;
  exam: ExamRecord;
  madrasaName: string;
  madrasaLogo?: string | null;
  classAverage?: number | null;
  classHighest?: number | null;
  classLowest?: number | null;
  classSize?: number | null;
}) {
  const { student: activeStudent } = useStudentFullDataFromParent(studentId);
  const studentName   = activeStudent?.name ?? "Student";
  const studentAdo    = activeStudent?.adno ?? "—";
  const studentGender = activeStudent?.gender ?? null;
  const studentClass  = activeStudent?.className ?? "—";
  const studentPhoto  = activeStudent?.photoUrl ?? activeStudent?.photo ?? null;
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"jpg" | "png" | "pdf" | "share" | null>(null);

  const rank        = summary?.rank ?? null;
  const headerGrad  = rank && rank <= 3 ? RANK_HEADER[rank].grad : DEFAULT_GRAD;
  const totalScore  = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax    = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const totalPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalScore / totalMax) * 100 : 0);
  const finalStatus = summary?.finalStatus ?? null;
  const totalGrade  = summary?.totalGrade  ?? null;

  const stem = `result-${studentName}`.replace(/\s+/g, "-");

  const run = async (type: "jpg" | "png" | "pdf" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg")   await downloadAsJPG(posterRef.current, stem);
      if (type === "png")   await downloadAsPNG(posterRef.current, stem);
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
      {/* Poster */}
       <div ref={posterRef}
        className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 w-full max-w-sm mx-auto"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className={cn("bg-gradient-to-br text-white text-center px-4 py-5 sm:px-6 sm:py-6 relative overflow-hidden", headerGrad)}>
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white" />
          </div>
          <div className="relative z-10">
            {madrasaLogo && (
              <img src={madrasaLogo} alt="" className="h-8 sm:h-9 w-auto mx-auto mb-1.5 object-contain" crossOrigin="anonymous" />
            )}
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest leading-tight">{madrasaName}</p>
            <p className="text-[11px] sm:text-xs opacity-75 font-medium mt-0.5">{exam.name}</p>
            <p className="text-[9px] sm:text-[10px] opacity-50 uppercase tracking-widest mt-1">Result Card</p>
          </div>
        </div>

        {/* Student identity */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-teal-600 border-2 border-gray-200 flex items-center justify-center shrink-0">
            {studentPhoto ? (
              <img src={studentPhoto} alt={studentName} className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {studentName?.trim()?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-[13px] sm:text-sm leading-tight truncate">{studentName}</p>
            <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
              Adm: <span className="font-mono font-semibold text-gray-700">{studentAdo}</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-gray-500">
              Class: <span className="font-semibold text-gray-700">{studentClass}</span>
            </p>
          </div>
          {rank && rank > 0 && (
            <div className="text-center shrink-0">
              {rank <= 3 ? (
                <>
                  <div className="text-xl sm:text-2xl leading-none">{RANK_MEDALS[rank - 1]}</div>
                  <span className={cn("mt-1 inline-block text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full text-white", RANK_HEADER[rank]?.badge)}>
                    {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
                  </span>
                </>
              ) : (
                <span className="text-[11px] sm:text-xs font-bold text-gray-400">#{rank}</span>
              )}
            </div>
          )}
        </div>

        {/* Marks table */}
        <table className="w-full text-[11px] sm:text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 sm:px-4 py-2 text-left font-bold text-gray-400 uppercase text-[9px] sm:text-[10px]">Subject</th>
              <th className="px-2 sm:px-3 py-2 text-right font-bold text-gray-400 uppercase w-10 sm:w-14 text-[9px] sm:text-[10px]">Max</th>
              <th className="px-2 sm:px-3 py-2 text-right font-bold text-gray-400 uppercase w-10 sm:w-14 text-[9px] sm:text-[10px]">Marks</th>
              <th className="px-3 sm:px-4 py-2 text-center font-bold text-gray-400 uppercase w-10 sm:w-14 text-[9px] sm:text-[10px]">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((r, idx) => {
              const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
              const isPassed = r.isPassed ?? gradeIsPassed(grade);
              return (
                <tr key={r.id} className={cn("hover:bg-gray-50/50", idx % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                  <td className="px-3 sm:px-4 py-2 font-medium text-gray-800 leading-tight">{r.subject?.name ?? "Subject"}</td>
                  <td className="px-2 sm:px-3 py-2 text-right text-gray-400 font-semibold tabular-nums">{r.totalMarks}</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-bold text-gray-900 tabular-nums">{r.score}</td>
                  <td className="px-3 sm:px-4 py-2 text-center">
                    <span className={cn("px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold border", GRADE_COLORS[grade] ?? "bg-gray-50 text-gray-600 border-gray-200")}>
                      {grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-primary-50/50 border-t-2 border-primary-100 font-bold text-gray-900">
              <td className="px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs">TOTAL</td>
              <td className="px-2 sm:px-3 py-2.5 text-right text-gray-500 tabular-nums">{totalMax}</td>
              <td className="px-2 sm:px-3 py-2.5 text-right text-primary-700 font-extrabold tabular-nums">{totalScore.toFixed(0)}</td>
              <td className="px-3 sm:px-4 py-2.5 text-center text-primary-700 font-extrabold tabular-nums">{totalPct.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>

        {/* Status banner */}
        {finalStatus && (
          <div className={cn(
            "px-4 sm:px-5 py-3 sm:py-3.5 border-t flex items-center justify-between text-xs",
            finalStatus === "PASSED" || finalStatus === "PROMOTED"
              ? "bg-primary-50 border-primary-100"
              : finalStatus === "FAILED"
              ? "bg-red-50 border-red-100"
              : "bg-amber-50 border-amber-100"
          )}>
            <span className="text-gray-500 font-medium text-[11px] sm:text-xs">Result Status</span>
            <span className={cn("px-2.5 sm:px-3 py-1 rounded-full font-bold border uppercase text-[11px] sm:text-xs", STATUS_STYLE[finalStatus])}>
              {finalStatus}
            </span>
          </div>
        )}

        {/* Class statistics — included in the generated card */}
        {(classAverage != null || classHighest != null || classLowest != null || classSize != null) && (
          <div className="bg-gradient-to-br from-primary-50 to-teal-50/50 px-4 sm:px-5 py-3 sm:py-4 border-t border-primary-100">
            <p className="text-[9px] sm:text-[10px] font-bold text-primary-700 uppercase tracking-widest mb-2">
              Class Statistics
            </p>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-[11px] sm:text-xs">
              {classAverage != null && (
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-gray-500 font-medium">Average</span>
                  <span className="font-extrabold text-gray-900 tabular-nums">{classAverage.toFixed(2)}%</span>
                </div>
              )}
              {classHighest != null && (
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-gray-500 font-medium">Highest</span>
                  <span className="font-extrabold text-primary-700 tabular-nums">{classHighest.toFixed(2)}%</span>
                </div>
              )}
              {classLowest != null && (
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-gray-500 font-medium">Lowest</span>
                  <span className="font-extrabold text-gray-900 tabular-nums">{classLowest.toFixed(2)}%</span>
                </div>
              )}
              {classSize != null && (
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-gray-500 font-medium">Class Size</span>
                  <span className="font-extrabold text-gray-900 tabular-nums">{classSize}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action group — prominent button cluster */}
      <div className="w-full max-w-sm mx-auto space-y-2">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] font-bold text-primary-700 text-center">
          Save & Share
        </p>
        <div className="flex items-stretch gap-1.5">
          <button
            onClick={() => run("share")}
            disabled={!!exporting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-all duration-200 ease-out shadow-sm hover:shadow active:scale-[0.98]"
          >
            {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share
          </button>
          <button
            onClick={() => run("jpg")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98]"
            title="Download as JPG"
          >
            {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            JPG
          </button>
          <button
            onClick={() => run("png")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98]"
            title="Download as PNG"
          >
            {exporting === "png" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PNG
          </button>
          <button
            onClick={() => run("pdf")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98]"
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
  const [exporting, setExporting] = useState<"jpg" | "png" | "pdf" | "share" | null>(null);
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

  const run = async (type: "jpg" | "png" | "pdf" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg")   await downloadAsJPG(posterRef.current, stem);
      if (type === "png")   await downloadAsPNG(posterRef.current, stem);
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
        <button onClick={() => run("png")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "png" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PNG
        </button>
        <button onClick={() => run("pdf")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          PDF
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors ml-auto">
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
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-teal-600 border-2 border-white flex items-center justify-center shrink-0">
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
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  useRefreshParentStudents();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const ayId  = user?.defaultAcademicYearId ?? "";
  const madrasaName = user?.madrasaName ?? user?.name ?? "My Madrasa";
  const madrasaLogo = user?.madrasaLogo ?? null;

  const effectiveId = activeStudentId ?? ids[0] ?? "";

  const [examSelection, setExamSelection] = useState<{ studentId: string; examId: string } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Drawer state
  const [cardOpen,     setCardOpen]     = useState(false);
  const [posterOpen,   setPosterOpen]   = useState(false);

  useEffect(() => {
    setDetailOpen(false);
    setCardOpen(false);
    setPosterOpen(false);
  }, [effectiveId]);

  // Load child details
  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === effectiveId);

  // ── Load published exams ──────────────────────────────────────────────────────
  const { data: examData, isLoading: loadingExams, error: examError, refetch: refetchExams, isRefetching } = useExams(
    { clientId: cid, token },
    { accademicYearId: ayId || undefined, studentId: effectiveId, limit: 100 },
  );
  const exams: ExamRecord[] = (examData?.data ?? []).filter((e) => e.examStatus === "PUBLISHED");
  const loading = loadingExams;
  const error = examError instanceof Error ? examError.message : null;

  const { data: summariesData, isLoading: loadingSummaries } = useQuery({
    queryKey: queryKeys.results.summaries(cid, { studentId: effectiveId, accademicYearId: ayId, limit: 100 }),
    queryFn: () => getSummaries(cid, token, { studentId: effectiveId, accademicYearId: ayId || undefined, limit: 100 }),
    enabled: !!cid && !!token && !!effectiveId,
  });
  const summaries = summariesData?.data ?? [];
  const summariesByExam = new Map(summaries.map((item) => [item.examId, item]));
  const { data: allResultsData, isLoading: loadingAllResults } = useQuery({
    queryKey: queryKeys.results.list(cid, { studentId: effectiveId, limit: 1000 }),
    queryFn: () => getResults(cid, token, { studentId: effectiveId, limit: 1000 }),
    enabled: !!cid && !!token && !!effectiveId,
  });
  const resultTotalsByExam = new Map<string, { score: number; max: number }>();
  for (const result of allResultsData?.data ?? []) {
    if (!result.exam?.id) continue;
    const totals = resultTotalsByExam.get(result.exam.id) ?? { score: 0, max: 0 };
    totals.score += result.score;
    totals.max += result.totalMarks;
    resultTotalsByExam.set(result.exam.id, totals);
  }

  const activeExamId = detailOpen && examSelection?.studentId === effectiveId && exams.some((exam) => exam.id === examSelection.examId)
    ? examSelection.examId
    : "";

  // ── Load results + summary when exam changes ──────────────────────────────────
  const { data: resultsData, isLoading: loadingResults, error: resultsError } = useResults(
    { clientId: cid, token },
    { examId: activeExamId, studentId: effectiveId, limit: 50 },
  );
  const results: ResultRecord[] = resultsData?.data ?? [];
  const summary: ExamSummary | null = summariesByExam.get(activeExamId) ?? null;

  // ── Load class report (class-level stats) when exam changes ────────────────────
  const activeExamForReport = exams.find((e) => e.id === activeExamId);
  const { data: classReportData } = useClassReport(
    { clientId: cid, token },
    { examId: activeExamId, classId: activeExamForReport?.classId ?? "" },
  );
  const classReport: ClassReport | null = classReportData ?? null;

  const activeExam   = exams.find((e) => e.id === activeExamId);
  const rank         = summary?.rank ?? null;
  const canRankCard  = rank !== null && rank <= 3;
  const totalObtained = summary?.totalScore ?? results.reduce((s, r) => s + r.score, 0);
  const totalMax      = summary?.totalMaxMarks ?? results.reduce((s, r) => s + r.totalMarks, 0);
  const overallPct    = summary?.totalPercentage ?? (totalMax > 0 ? (totalObtained / totalMax) * 100 : 0);
  const passedCount = results.filter((result) => {
    const grade = result.grade ?? calcFallbackGrade(result.score, result.totalMarks);
    return result.isPassed ?? gradeIsPassed(grade);
  }).length;
  const passRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;
  const subjectChartData = results.map((result, index) => ({
    subject: result.subject?.name ?? `Subject ${index + 1}`,
    score: result.totalMarks > 0 ? Math.max(0, Math.min(100, (result.score / result.totalMarks) * 100)) : 0,
  }));

  // Class-level statistics — prefer the values stored on the student's
  // summary (computed during the last `summaries/compute` run), fall back to
  // the live class report if not yet computed.
  const classAverage = summary?.classAverage
    ?? classReport?.stats?.classAverage
    ?? null;
  const classHighest = summary?.classHighest
    ?? (classReport?.students?.length
      ? Math.max(...classReport.students.map((s) => s.summary.totalPercentage ?? 0))
      : null);
  const classLowest = summary?.classLowest
    ?? (classReport?.students?.length
      ? Math.min(...classReport.students.map((s) => s.summary.totalPercentage ?? 0))
      : null);
  const classSize = summary?.classSize
    ?? classReport?.stats?.totalStudents
    ?? null;

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "resultsPageTitle", lang)} />
      <div className="space-y-5 px-3 py-3 sm:px-4 lg:px-8 lg:py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}
          </div>
        ) : !effectiveId ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
            <GraduationCap className="mx-auto mb-3 size-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-900">No children linked to this account</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        ) : (
          <div className="space-y-4">
            {exams.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
                <Medal className="mx-auto mb-3 size-10 text-gray-300" />
                <p className="text-sm font-semibold text-gray-900">No published results yet</p>
                <p className="mt-1 text-xs text-gray-500">Once examination results are published, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-primary-100 overflow-hidden rounded-2xl mt-3">
                {exams.map((exam) => {
                  const examSummary = summariesByExam.get(exam.id);
                  const totals = resultTotalsByExam.get(exam.id);
                  const percentage = examSummary?.totalPercentage != null
                    ? examSummary.totalPercentage
                    : totals && totals.max > 0 ? (totals.score / totals.max) * 100 : null;
                  const displayPercentage = percentage != null && Number.isFinite(percentage)
                    ? Math.max(0, Math.min(100, percentage)) : null;
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => { setExamSelection({ studentId: effectiveId, examId: exam.id }); setDetailOpen(true); }}
                      className="block w-full    bg-gradient-to-r from-white via-white to-primary-50/50 p-4 text-left transition-colors hover:border-primary-300 hover:from-primary-50/40 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-950 sm:text-base">{exam.name}</h3>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="size-3.5 shrink-0" /> {fmt(exam.startDate)}{exam.endDate && exam.endDate !== exam.startDate ? ` – ${fmt(exam.endDate)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-base font-semibold tabular-nums text-primary-700 sm:text-lg">
                            {displayPercentage != null ? `${displayPercentage.toFixed(1)}%` : loadingSummaries || loadingAllResults ? "…" : "—"}
                          </span>
                          <ChevronRight className="size-4 text-gray-400" />
                        </div>
                      </div>
                      <div
                        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-primary-50 via-emerald-50 to-teal-100"
                        role="progressbar"
                        aria-label={`${exam.name} percentage`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={displayPercentage ?? undefined}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all"
                          style={{ width: `${displayPercentage ?? 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ResponsivePopover
          open={detailOpen && !!activeExam}
          onOpenChange={setDetailOpen}
          side="responsive"
          fullHeight
          title={activeExam?.name ?? "Exam details"}
          description={activeStudent ? `${activeStudent.name} · ${fmt(activeExam?.startDate)}${activeExam?.endDate ? ` – ${fmt(activeExam.endDate)}` : ""}` : undefined}
        >
          {activeExam && (
            <div className="mx-auto w-full max-w-5xl space-y-5 p-4 pb-8 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button onClick={() => setCardOpen(true)} disabled={loadingResults || results.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                  <FileBadge2 className="size-3.5" /> Result card
                </button>
                {canRankCard && <button onClick={() => setPosterOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                  <Trophy className="size-3.5" /> Rank poster
                </button>}
                <button onClick={() => window.print()}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  <Printer className="size-3.5" /> Print
                </button>
              </div>

              {loadingResults || loadingSummaries ? (
                <div className="space-y-3">
                  <Skeleton className="h-28 rounded-2xl" />
                  <Skeleton className="h-64 rounded-2xl" />
                </div>
              ) : resultsError ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">Unable to load marks for this exam.</div>
              ) : results.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">No marks records available for this exam.</div>
              ) : (
                <div className="space-y-5">
                {/* Results overview follows the compact statistics layout used on the fees page. */}
                <section className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-sky-50 print:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-950">Performance overview</h3>
                      <p className="mt-0.5 text-xs text-gray-500">{results.length} subjects · {totalObtained.toFixed(0)} of {totalMax} marks</p>
                    </div>
                    {summary?.finalStatus && (
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[summary.finalStatus] ?? "border-gray-200 bg-gray-50 text-gray-700")}>
                        {summary.finalStatus}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 lg:grid-cols-4">
                    <div className="min-w-0 bg-white/90 p-3 sm:p-4">
                      <h4 className="text-[11px] font-medium text-gray-600">Overall score</h4>
                      <HalfRadialChart value={overallPct} label="of total marks" color="var(--primary)" />
                      <p className="text-[11px] text-gray-500">{totalObtained.toFixed(0)} / {totalMax} marks</p>
                    </div>
                    <div className="min-w-0 bg-white/90 p-3 sm:p-4">
                      <h4 className="text-[11px] font-medium text-gray-600">Subjects passed</h4>
                      <HalfRadialChart value={passRate} label="pass rate" color="#0d9488" />
                      <p className="text-[11px] text-gray-500">{passedCount} of {results.length} subjects</p>
                    </div>
                    {[
                      { label: "Grade", value: summary?.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] : calcFallbackGrade(totalObtained, totalMax), detail: "Overall result", icon: Award },
                      { label: "Class rank", value: rank ? `#${rank}` : "—", detail: classSize != null ? `of ${classSize} students` : "Class standing", icon: Trophy },
                      { label: "Class average", value: classAverage != null ? `${classAverage.toFixed(1)}%` : "—", detail: classAverage != null ? `${Math.abs(overallPct - classAverage).toFixed(1)} points ${overallPct >= classAverage ? "above" : "below"}` : "Not available", icon: TrendingUp },
                      { label: "Subjects", value: results.length, detail: `${passedCount} passed`, icon: BookOpen },
                      { label: "Highest", value: classHighest != null ? `${classHighest.toFixed(1)}%` : "—", detail: "Class score", icon: Medal },
                      { label: "Lowest", value: classLowest != null ? `${classLowest.toFixed(1)}%` : "—", detail: "Class score", icon: Medal },
                      { label: "Class size", value: classSize ?? "—", detail: "Students", icon: Users },
                      { label: "Total marks", value: `${totalObtained.toFixed(0)}/${totalMax}`, detail: "Obtained / maximum", icon: FileText },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="min-w-0 bg-white/90 p-3 sm:p-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary-700" />
                            <span>{stat.label}</span>
                          </div>
                          <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg">{stat.value}</div>
                          <div className="mt-1 text-[11px] text-gray-500">{stat.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white print:hidden">
                  <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                    <h3 className="text-sm font-semibold text-gray-950">Subject performance</h3>
                    <p className="mt-0.5 text-xs text-gray-500">Score as a percentage of each subject's full marks</p>
                  </div>
                  <div className="p-3 sm:p-5">
                    <ChartContainer
                      config={resultChartConfig}
                      className="w-full"
                      style={{ height: Math.max(220, subjectChartData.length * 42) }}
                      role="img"
                      aria-label="Score percentage by subject"
                    >
                      <BarChart accessibilityLayer data={subjectChartData} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 0 }}>
                        <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
                        <YAxis dataKey="subject" type="category" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => `${Number(value).toFixed(1)}%`} />} />
                        <Bar dataKey="score" fill="var(--color-score)" radius={[0, 5, 5, 0]} maxBarSize={22} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </section>

                {/* Subject wise marks — simple elegant table */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="px-4 sm:px-5 py-3 border-b border-gray-100 print:hidden">
                    <h3 className="font-semibold text-gray-900 text-sm">Subject Wise Marks</h3>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-4 sm:px-5 py-2.5 w-10 text-center text-gray-400 font-normal">#</th>
                          <th className="px-3 py-2.5 font-normal">Subject</th>
                          <th className="px-3 py-2.5 w-24 sm:w-28 text-center font-normal">Full</th>
                          <th className="px-3 py-2.5 w-24 sm:w-28 text-center font-normal">Pass</th>
                          <th className="px-3 py-2.5 w-28 sm:w-32 text-center font-normal">Obtained</th>
                          <th className="px-4 sm:px-5 py-2.5 w-20 sm:w-24 text-center font-normal">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, idx) => {
                          const grade = r.grade ?? calcFallbackGrade(r.score, r.totalMarks);
                          const isPassed = r.isPassed ?? gradeIsPassed(grade);
                          const gClass = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";

                          return (
                            <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40 transition-colors">
                              <td className="px-4 sm:px-5 py-2.5 text-center text-gray-300 text-xs tabular-nums">{idx + 1}</td>
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
                              <td className="px-4 sm:px-5 py-2.5 text-center">
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
                          <td className="px-4 sm:px-5 py-2.5 text-center text-gray-300 text-xs">—</td>
                          <td className="px-3 py-2.5 font-semibold text-sm">Total</td>
                          <td className="px-3 py-2.5 text-center text-sm tabular-nums">{totalMax}</td>
                          <td className="px-3 py-2.5 text-center text-gray-300 text-sm">—</td>
                          <td className="px-3 py-2.5 text-center text-primary-700 font-semibold text-sm tabular-nums">{totalObtained.toFixed(0)}</td>
                          <td className="px-4 sm:px-5 py-2.5 text-center text-sm">
                            <span className="text-primary-700 font-semibold tabular-nums">{overallPct.toFixed(1)}%</span>
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
                      const pct = r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0;

                      return (
                        <div key={r.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-[13px] leading-tight truncate">{r.subject?.name ?? "Subject"}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn("text-sm font-bold tabular-nums", isPassed ? "text-gray-900" : "text-rose-600")}>
                                {r.score}<span className="text-gray-400 font-normal text-[11px]">/{r.totalMarks}</span>
                              </span>
                              <span className={cn("inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border min-w-[28px] text-center", gClass)}>
                                {grade}
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all",
                                pct >= 80 ? "bg-primary-500" :
                                pct >= 60 ? "bg-teal-500" :
                                pct >= 40 ? "bg-amber-500" : "bg-red-400"
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Total summary on mobile */}
                    <div className="px-4 py-3 bg-gray-50/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">Total · {results.length} subjects</span>
                        <span className="text-sm font-bold text-primary-700 tabular-nums">{overallPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full",
                            overallPct >= 80 ? "bg-primary-500" :
                            overallPct >= 60 ? "bg-teal-500" :
                            overallPct >= 40 ? "bg-amber-500" : "bg-red-400"
                          )}
                          style={{ width: `${Math.min(overallPct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-gray-500 tabular-nums">{totalObtained.toFixed(0)}/{totalMax} marks</span>
                        {summary?.totalGrade && (
                          <span className="text-[11px] font-semibold text-gray-600">{TOTAL_GRADE_LABELS[summary.totalGrade]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                </div>
              )}

              <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-950">Exam information</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div><dt className="text-gray-500">Exam period</dt><dd className="mt-1 font-semibold text-gray-900">{fmt(activeExam.startDate)} – {fmt(activeExam.endDate)}</dd></div>
                  <div><dt className="text-gray-500">Published</dt><dd className="mt-1 font-semibold text-gray-900">{fmt(activeExam.publishedDate)}</dd></div>
                  <div><dt className="text-gray-500">Academic year</dt><dd className="mt-1 font-semibold text-gray-900">{activeExam.accademicYear?.name ?? "Current"}</dd></div>
                  <div><dt className="text-gray-500">Mark entry deadline</dt><dd className="mt-1 font-semibold text-gray-900">{fmt(activeExam.markEntryLastDate)}</dd></div>
                  <div><dt className="text-gray-500">Maximum marks</dt><dd className="mt-1 font-semibold text-gray-900">{activeExam.maxMarks ?? 100}</dd></div>
                  <div><dt className="text-gray-500">Pass marks</dt><dd className="mt-1 font-semibold text-gray-900">{activeExam.passMarks ?? 40}</dd></div>
                </dl>
              </section>
            </div>
          )}
        </ResponsivePopover>

        {/* Result Card drawer — responsive: right on desktop, bottom on mobile */}
        <ResponsivePopover
          open={cardOpen}
          onOpenChange={setCardOpen}
          side="responsive"
          title="Result Card"
          description="Share or download a beautifully formatted result card"
        >
          <div className="p-4 sm:p-6">
              {activeExam && activeStudent && (
              <ParentResultCard
                studentId={activeStudent.id}
                results={results}
                summary={summary}
                exam={activeExam}
                madrasaName={madrasaName}
                madrasaLogo={madrasaLogo}
                classAverage={classAverage}
                classHighest={classHighest}
                classLowest={classLowest}
                classSize={classSize}
              />
            )}
          </div>
        </ResponsivePopover>

        {/* Rank Poster drawer — responsive: right on desktop, bottom on mobile */}
        <ResponsivePopover
          open={posterOpen}
          onOpenChange={setPosterOpen}
          side="responsive"
          title="Rank Poster"
          description="Celebrate your child's achievement"
        >
          <div className="p-4 sm:p-6">
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
        </ResponsivePopover>
      </div>
    </DashboardLayout>
  );
}
