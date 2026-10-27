import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getResults, type ResultRecord } from "@/lib/results-api";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TrendingUp, Download, Loader2, Users, Trophy, CalendarDays, School, ChevronDown, Check, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";

function getGrade(score: number) {
  if (score >= 90) return { label: "A+", color: "var(--primary)", badge: "bg-primary-100 text-primary-700" };
  if (score >= 75) return { label: "A", color: "#3b82f6", badge: "bg-blue-100 text-blue-700" };
  if (score >= 60) return { label: "B", color: "#8b5cf6", badge: "bg-purple-100 text-purple-700" };
  if (score >= 45) return { label: "C", color: "#f59e0b", badge: "bg-amber-100 text-amber-700" };
  return { label: "F", color: "#ef4444", badge: "bg-red-100 text-red-700" };
}

function getInitials(name?: string) {
  return name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || "—";
}

export default function TeacherPerformancePage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const { activeClassId, activeClass } = useActiveClass();
  const [activeExamId, setActiveExamId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cid || !token || !activeClassId) return;
    setExams([]);
    setResults([]);
    let cancelled = false;
    getExams(cid, token, { accademicYearId: ayId || undefined, limit: 20 })
      .then((data) => {
        if (cancelled) return;
        const available = (data.data ?? []).filter((exam) => !exam.classId || exam.classId === activeClassId);
        setExams(available);
        setActiveExamId((current) => available.some((exam) => exam.id === current) ? current : available[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setExams([]);
          setActiveExamId("");
        }
      });
    return () => { cancelled = true; };
  }, [cid, token, activeClassId, ayId]);

  useEffect(() => {
    if (!cid || !token || !activeExamId) return;
    let cancelled = false;
    getResults(cid, token, {
      examId: activeExamId,
      classId: activeClassId,
      limit: 100,
    })
      .then((data) => { if (!cancelled) setResults(data.data ?? []); })
      .catch(() => { if (!cancelled) setResults([]); });
    return () => { cancelled = true; };
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
      <div className="p-0! pb-6!">
        <PageHeader title={t("teacherPages", "classPerformanceTitle", lang)} />

        <div ref={printRef} className="mx-3 space-y-3 pt-6">
          <header className="flex items-center justify-between gap-3 pb-1">
            <button
              type="button"
              aria-label={`${t("teacherPages", "performanceSelectExam", lang)}: ${activeExam?.name ?? ""}`}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
              className="group min-w-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-4"
            >
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <School className="h-3.5 w-3.5 text-primary-700" />
                {activeClass?.name ?? t("common", "class", lang)}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-lg font-semibold tracking-tight text-gray-950 sm:text-xl">
                  {activeExam?.name ?? t("teacherPages", "performanceSelectExam", lang)}
                </span>
                <ChevronDown data-html2canvas-ignore className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-primary-700" />
              </span>
            </button>
            {results.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                data-html2canvas-ignore
                onClick={handleDownloadPDF}
                disabled={downloadingPdf}
                aria-label={t("teacherPages", downloadingPdf ? "performanceGeneratingPdf" : "performanceDownloadPdf", lang)}
                className="shrink-0 rounded-xl border-gray-200 bg-white"
              >
                {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="hidden sm:inline">{t("teacherPages", downloadingPdf ? "performanceGeneratingPdf" : "performanceDownloadPdf", lang)}</span>
              </Button>
            )}
          </header>

          {loading ? (
            <div className="space-y-3" aria-label={t("common", "loading", lang)}>
              <Skeleton className="h-36 rounded-2xl" />
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : (
            <>
              <section aria-label={t("common", "overview", lang)} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="row-span-2 flex flex-col justify-between rounded-2xl bg-primary-900 p-4 text-white sm:row-span-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-primary-100">{t("teacherPages", "avgScoreSummary", lang)}</span>
                    <TrendingUp className="h-4 w-4 text-primary-200" />
                  </div>
                  <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums sm:mt-5">
                    {results.length ? avgScore : "—"}
                    {results.length > 0 && <span className="ml-0.5 text-xl font-medium text-primary-200">%</span>}
                  </p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary-300" style={{ width: `${Math.max(0, Math.min(avgScore, 100))}%` }} />
                  </div>
                </div>
                <div className="flex flex-col justify-between rounded-2xl border border-gray-200/70 bg-white px-3 py-2.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-gray-500">
                    <span>{t("teacherPages", "studentsSummary", lang)}</span>
                    <Users className="h-4 w-4 shrink-0 text-primary-600" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-gray-950 sm:mt-5 sm:text-3xl">{results.length}</p>
                </div>
                <div className="flex flex-col justify-between rounded-2xl border border-gray-200/70 bg-white px-3 py-2.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-gray-500">
                    <span>{t("teacherPages", "performanceHighestScore", lang)}</span>
                    <Trophy className="h-4 w-4 shrink-0 text-amber-600" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-gray-950 sm:mt-5 sm:text-3xl">{sortedStudents[0]?.score ?? "—"}</p>
                </div>
              </section>

              {results.length === 0 ? (
                <section className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <BarChart3 className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-gray-700">
                    {exams.length === 0 ? t("teacherPages", "noExamsFound", lang) : t("teacherPages", "noResultsRecorded", lang)}
                  </p>
                  {exams.length > 0 && (
                    <Button variant="outline" onClick={() => setFiltersOpen(true)} className="mt-4 rounded-lg">
                      {t("teacherPages", "performanceSelectExam", lang)}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  )}
                </section>
              ) : (
                <>
                  <div className="grid items-stretch gap-3 md:grid-cols-2">
                    <section className="rounded-2xl border border-gray-200/70 bg-white" aria-labelledby="performance-grades-title">
                      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
                        <div>
                          <h2 id="performance-grades-title" className="text-sm font-semibold text-gray-900">{t("teacherPages", "gradeDistribution", lang)}</h2>
                          <p className="mt-0.5 text-xs text-gray-500">{t("teacherPages", "performanceGradeCaption", lang)}</p>
                        </div>
                        <BarChart3 className="h-4 w-4 text-gray-400" />
                      </div>
                      <ul className="space-y-4 px-4 pb-5 pt-3">
                        {gradeData.map((entry) => {
                          const percentage = Math.round((entry.count / results.length) * 100);
                          return (
                            <li key={entry.grade} className="flex items-center gap-3">
                              <span className="w-6 shrink-0 text-xs font-semibold text-gray-700">{entry.grade}</span>
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                                <span className="block h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: entry.color }} />
                              </span>
                              <span className="w-6 text-right text-sm font-semibold tabular-nums text-gray-900">{entry.count}</span>
                              <span className="w-9 text-right text-[11px] tabular-nums text-gray-400">{percentage}%</span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white" aria-labelledby="performance-top-title">
                      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
                        <h2 id="performance-top-title" className="text-sm font-semibold text-gray-900">{t("teacherPages", "topStudents", lang)}</h2>
                        <Trophy className="h-4 w-4 text-amber-500" />
                      </div>
                      <ol className="px-2 pb-2">
                        {topStudents.map((result, index) => (
                          <li key={result.id} className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2", index === 0 && "bg-amber-50/70")}>
                            <span className={cn("w-4 shrink-0 text-center text-[11px] font-semibold tabular-nums", index === 0 ? "text-amber-700" : "text-gray-400")}>{index + 1}</span>
                            <span aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", index === 0 ? "bg-amber-100 text-amber-800" : "bg-primary-50 text-primary-700")}>
                              {getInitials(result.student?.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-gray-900">{result.student?.name ?? "—"}</span>
                              <span className="block text-[10px] text-gray-500">{result.student?.adno ?? "—"}</span>
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-gray-900">{result.score}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  </div>

                  <section className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white" aria-labelledby="performance-ranking-title">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <h2 id="performance-ranking-title" className="text-sm font-semibold text-gray-900">{t("teacherPages", "performanceRanking", lang)}</h2>
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary-700">{sortedStudents.length}</span>
                      </div>
                      <span className="text-[11px] text-gray-500">{t("teacherPages", "performanceScoreOrder", lang)}</span>
                    </div>
                    <table className="w-full table-fixed text-left">
                      <thead className="border-y border-gray-100 bg-gray-50/80 text-[10px] font-medium text-gray-500 sm:text-xs">
                        <tr>
                          <th scope="col" className="w-12 px-2 py-2 text-center font-medium sm:w-16">{t("teacherPages", "rankLabel", lang)}</th>
                          <th scope="col" className="px-2 py-2 font-medium">{t("teacherPages", "performanceStudent", lang)}</th>
                          <th scope="col" className="w-16 px-2 py-2 text-right font-medium sm:w-24">{t("teacherPages", "performanceScore", lang)}</th>
                          <th scope="col" className="w-16 px-2 py-2 text-center font-medium sm:w-24">{t("teacherPages", "performanceGrade", lang)}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedStudents.map((result, index) => {
                          const grade = getGrade(result.score);
                          return (
                            <tr key={result.id} className="transition-colors hover:bg-gray-50/70">
                              <td className="px-2 py-2.5 text-center text-xs font-medium tabular-nums text-gray-400">{String(index + 1).padStart(2, "0")}</td>
                              <td className="px-2 py-2.5">
                                <p className="truncate text-xs font-semibold text-gray-900 sm:text-sm">{result.student?.name ?? "—"}</p>
                                <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">{result.student?.adno ?? "—"}</p>
                              </td>
                              <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-gray-900">{result.score}</td>
                              <td className="px-2 py-2.5 text-center">
                                <span className={cn("inline-flex min-w-8 justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold sm:text-xs", grade.badge)}>{grade.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </section>
                  <p className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-gray-400">
                    <CalendarDays className="h-3 w-3" />
                    {t("teacherPages", "performanceGeneratedOn", lang).replace("{date}", new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric" }))}
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <ResponsivePopover
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          side="bottom"
          drawerOnDesktop
          title={t("teacherPages", "performanceSelectExam", lang)}
          className="mx-auto w-full max-w-lg rounded-t-2xl"
        >
          <div className="space-y-1 px-3 pb-4">
            {exams.length > 0 ? exams.map((exam) => (
              <button
                key={exam.id}
                type="button"
                aria-pressed={activeExamId === exam.id}
                onClick={() => {
                  setActiveExamId(exam.id);
                  setResults([]);
                  setFiltersOpen(false);
                }}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary-500", activeExamId === exam.id ? "bg-primary-50 font-semibold text-primary-800" : "text-gray-700 hover:bg-gray-50")}
              >
                <BarChart3 className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 break-words">{exam.name}</span>
                {activeExamId === exam.id && <Check className="h-4 w-4 shrink-0 text-primary-700" />}
              </button>
            )) : (
              <p className="px-3 py-4 text-sm text-gray-500">{t("teacherPages", "noExamsFound", lang)}</p>
            )}
          </div>
        </ResponsivePopover>
      </div>
    </DashboardLayout>
  );
}
