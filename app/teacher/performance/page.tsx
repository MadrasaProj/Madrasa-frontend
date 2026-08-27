import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getResults, type ResultRecord } from "@/lib/results-api";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getHomeworkSummary } from "@/lib/reports-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Star,
  TrendingUp,
  BookOpen,
  Download,
  Loader2,
  Users,
  Award,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function getGrade(score: number) {
  if (score >= 90) return { label: "A+", color: "#10b981", badge: "bg-emerald-100 text-emerald-700" };
  if (score >= 75) return { label: "A", color: "#3b82f6", badge: "bg-blue-100 text-blue-700" };
  if (score >= 60) return { label: "B", color: "#8b5cf6", badge: "bg-purple-100 text-purple-700" };
  if (score >= 45) return { label: "C", color: "#f59e0b", badge: "bg-amber-100 text-amber-700" };
  return { label: "F", color: "#ef4444", badge: "bg-red-100 text-red-700" };
}

export default function TeacherPerformancePage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [hwSummary, setHwSummary] = useState<{
    completionRate: number;
    totalAssignments: number;
  } | null>(null);
  const [activeClassId, setActiveClassId] = useState("");
  const [activeExamId, setActiveExamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cid || !token) return;
    Promise.all([
      getMyClasses(cid, token),
      getHomeworkSummary(cid, token).catch(() => null),
    ])
      .then(([cls, hw]) => {
        setClasses(cls);
        setHwSummary(
          hw
            ? {
                completionRate: hw.completionRate,
                totalAssignments: hw.totalAssignments,
              }
            : null,
        );
        if (cls.length > 0) setActiveClassId(cls[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid, token]);

  useEffect(() => {
    if (!cid || !token || !activeClassId) return;
    getExams(cid, token, { accademicYearId: ayId || undefined, limit: 20 })
      .then((data) => {
        setExams(data.data ?? []);
        const first = data.data?.[0];
        if (first) setActiveExamId(first.id);
      })
      .catch(() => {});
  }, [cid, token, activeClassId, ayId]);

  useEffect(() => {
    if (!cid || !token || !activeExamId) return;
    getResults(cid, token, {
      examId: activeExamId,
      classId: activeClassId,
      limit: 100,
    })
      .then((data) => setResults(data.data ?? []))
      .catch(() => {});
  }, [cid, token, activeExamId, activeClassId]);

  const gradeData = ["A+", "A", "B", "C", "F"].map((g) => ({
    grade: g,
    count: results.filter((r) => getGrade(r.score).label === g).length,
    color: getGrade(
      g === "A+" ? 95 : g === "A" ? 80 : g === "B" ? 65 : g === "C" ? 50 : 0,
    ).color,
  }));

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

  const sortedStudents = [...results].sort((a, b) => b.score - a.score);
  const topStudents = sortedStudents.slice(0, 5);

  const activeClass = classes.find((c) => c.id === activeClassId);
  const activeExam = exams.find((e) => e.id === activeExamId);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import("html2canvas-pro").then((m) => m.default),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const imgWidth = pW - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pH - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pH - 20);
      }

      const filename = `${activeClass?.name || "Class"}_${activeExam?.name || "Exam"}_Performance_Report`.replace(
        /\s+/g,
        "_",
      );
      pdf.save(`${filename}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t("teacherPages", "classPerformanceTitle", lang)}
        subtitle={activeClass ? `${activeClass.name} • ${activeExam?.name || "Academic Report"}` : "Performance Analytics"}
        icon={Star}
        back
        backHref="/teacher"
        action={
          results.length > 0 ? (
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4"
            >
              <Skeleton className="w-7 h-7 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-12 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Class selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeClassId === cls.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Exam selector */}
          {exams.length > 0 && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {exams.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setActiveExamId(ex.id)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all",
                    activeExamId === ex.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          )}

          {/* Printable Report Container */}
          <div ref={printRef} className="space-y-5 bg-white p-4 lg:p-6 rounded-3xl border border-gray-100 shadow-xs mb-10">
            {/* Header in printable container */}
            <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-600" />
                  {t("teacherPages", "classPerformanceTitle", lang)}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Class: <span className="font-semibold text-gray-800">{activeClass?.name ?? "—"}</span>
                  {activeExam && (
                    <>
                      {" • "}Exam: <span className="font-semibold text-gray-800">{activeExam.name}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 self-start md:self-auto">
                <Calendar className="w-3.5 h-3.5" />
                <span>Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: t("teacherPages", "studentsSummary", lang),
                  value: results.length,
                  icon: Users,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  label: t("teacherPages", "avgScoreSummary", lang),
                  value: `${avgScore}%`,
                  icon: TrendingUp,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  label: t("teacherPages", "hwCompletionSummary", lang),
                  value: hwSummary ? `${hwSummary.completionRate}%` : "—",
                  icon: BookOpen,
                  color: "text-indigo-600",
                  bg: "bg-indigo-50",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="bg-gray-50/70 rounded-2xl border border-gray-100 p-3.5 text-center"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5",
                      bg,
                    )}
                  >
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                {exams.length === 0
                  ? t("teacherPages", "noExamsFound", lang)
                  : t("teacherPages", "noResultsRecorded", lang)}
              </div>
            ) : (
              <>
                {/* Grade distribution chart */}
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    {t("teacherPages", "gradeDistribution", lang)}
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={gradeData} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                        {gradeData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top performers summary highlight */}
                {topStudents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t("teacherPages", "topStudents", lang)}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {topStudents.map((r, i) => {
                        const grade = getGrade(r.score);
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 p-3 bg-amber-50/40 rounded-2xl border border-amber-100/70"
                          >
                            <div
                              className={cn(
                                "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                                i === 0
                                  ? "bg-amber-100 text-amber-800 font-extrabold"
                                  : i === 1
                                    ? "bg-gray-200 text-gray-700"
                                    : "bg-orange-100 text-orange-800",
                              )}
                            >
                              #{i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {r.student?.name}
                              </p>
                              <p className="text-[10px] text-gray-400">{r.student?.adno}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-gray-900">{r.score}</span>
                              <span
                                className="block text-[10px] font-bold px-1.5 py-0.2 rounded"
                                style={{ color: grade.color }}
                              >
                                {grade.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Complete Student Performance Table */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      All Students Performance ({sortedStudents.length})
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                          <th className="py-2.5 px-4 w-28">Ad. No</th>
                          <th className="py-2.5 px-4">Student Name</th>
                          <th className="py-2.5 px-4 text-center w-24">Score</th>
                          <th className="py-2.5 px-4 text-center w-24">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedStudents.map((r, i) => {
                          const grade = getGrade(r.score);
                          return (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-2.5 px-4 text-center font-bold text-gray-500">
                                {i + 1}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-gray-500">
                                {r.student?.adno ?? "—"}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-gray-900">
                                {r.student?.name}
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-gray-900">
                                {r.score}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", grade.badge)}>
                                  {grade.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
