import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { BookOpen, CalendarDays, Download, Flame, GraduationCap, Heart, Image, Loader2, SquareChartGantt, Target } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BestPerformanceMetric } from "@/components/BestPerformanceMetric";
import { ScrollableRangeNavigator, commonRangePreset } from "@/components/ScrollableRangeNavigator";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";
import { BestPerformancePoster, type PosterStudent } from "@/components/teacher/BestPerformancePoster";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OverallBestPerformer } from "@/lib/best-performance-api";
import { downloadBestPerformanceReport } from "@/lib/best-performance-report";
import { periodDates } from "@/lib/best-performance-period";
import { useBestPerformers, useOverallBestStudents } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useActiveClass } from "@/store/activeClass";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";

function totalMaxScore(performer: OverallBestPerformer) {
  return (performer.attendance.maxScore + performer.homework.maxScore + performer.exam.maxScore + performer.ibadah.maxScore) || 100;
}

function ReportCard({ category, lang, count, downloading, onDownload, onPosters }: {
  category: "total" | "ibadah";
  lang: string;
  count: number;
  downloading: boolean;
  onDownload: () => void;
  onPosters: () => void;
}) {
  const isMalayalam = lang === "ml";
  return (
    <section className="relative min-h-[100px] overflow-hidden rounded-2xl border-2 border-white bg-linear-120 from-white via-primary-50 to-white p-3 shadow-xs sm:p-4" aria-label={isMalayalam ? "പ്രകടന റിപ്പോർട്ടും പോസ്റ്ററുകളും" : "Performance report and posters"}>
      <div className="relative z-10 flex h-full min-w-0 flex-col items-start justify-center pr-24 sm:pr-36">
        <h2 className="text-sm font-bold leading-5 text-gray-950 sm:text-base">{isMalayalam ? (category === "total" ? "ക്ലാസ് പ്രകടന റിപ്പോർട്ടും മികച്ച വിദ്യാർത്ഥികളുടെ പോസ്റ്ററുകളും" : "ഇബാദത്ത് പ്രകടന റിപ്പോർട്ടും മികച്ച വിദ്യാർത്ഥികളുടെ പോസ്റ്ററുകളും") : (category === "total" ? "Class performance report and top-student posters" : "Ibadah performance report and top-student posters")}</h2>
        {/* <p className="mt-1 text-xs leading-4 text-gray-600">{isMalayalam ? "ഈ കാലയളവിലെ മുഴുവൻ റാങ്കിംഗും ആദ്യ മൂന്ന് വിദ്യാർത്ഥികളുടെ വ്യക്തിഗത പോസ്റ്ററുകളും ലഭിക്കും." : "Get the full ranking for this period or a personalized poster for each of the top three students."}</p> */}
        <div className="mt-4 flex gap-2" aria-label={isMalayalam ? "പ്രകടന ഫയലുകൾ" : "Performance files"}>
          <Button type="button" size="xs" onClick={onDownload} disabled={count === 0 || downloading} aria-label={isMalayalam ? "റിപ്പോർട്ട് ഡൗൺലോഡ്" : "Download report"} className="gap-1.5 px-3">
            {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />:<SquareChartGantt size={16}/>}
            {isMalayalam ? "റിപ്പോർട്ട്" : "Report"}
          </Button>
          <Button type="button" size="xs" variant="outline" onClick={onPosters} disabled={count === 0} aria-label={isMalayalam ? "പോസ്റ്റർ തിരഞ്ഞെടുക്കുക" : "Choose poster"} className="bg-white px-3">
          <Image/>  {isMalayalam ? "പോസ്റ്റർ" : "Poster"}
          </Button>
        </div>
      </div>
      <img src="/imgs/teacher/best-performance-report-art.webp" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 size-28 object-contain sm:size-32" loading="lazy" />
    </section>
  );
}

function ScoreHero({ name, className, photoUrl, rank, score, percentage, heading, scoreLabel, children }: {
  name: string;
  className?: string;
  photoUrl?: string | null;
  rank: string;
  score: number;
  percentage: number;
  heading: string;
  scoreLabel: string;
  children: React.ReactNode;
}) {
  const progress = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  return (
    <section className="overflow-hidden rounded-2xl bg-white" aria-label={heading}>
      <div className="rounded-t-2xl bg-gradient-to-br from-white via-primary-50/30 to-white px-4 pb-7 pt-5 sm:px-6" style={{
        backgroundImage: "linear-gradient(rgb(255 255 255 / 0.78), rgb(255 255 255 / 0.78)), url('/imgs/teacher/dashboard-corner-primary.png')",
        backgroundPosition: "center, right bottom", backgroundSize: "cover, min(80%, 30rem) auto", backgroundRepeat: "no-repeat",
      }}>
        <div className="flex items-center gap-3">
          <StudentAvatar name={name} photoUrl={photoUrl} size="lg" className="size-11 ring-2 ring-primary-100" />
          <div className="min-w-0 flex-1"><p className="truncate text-base font-bold text-gray-950">{name}</p>{className && <p className="mt-0.5 text-xs text-gray-600">{className}</p>}</div>
          <span className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-primary-800">{rank}</span>
        </div>
        <div className="flex flex-col items-center pt-7">
          <div className="flex size-40 items-center justify-center rounded-full bg-white/70 p-2" role="img" aria-label={`${scoreLabel}: ${score}`}>
            <div className="flex size-full items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${progress}%, #e5e7eb 0)` }}>
              <div className="flex size-30 flex-col items-center justify-center rounded-full bg-white"><span className="text-4xl font-bold leading-none tabular-nums text-gray-950">{score}</span><span className="mt-1 text-xs font-medium text-gray-500">{scoreLabel}</span></div>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-800">{heading}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100">{children}</div>
    </section>
  );
}

export default function TeacherBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();
  const { activeClass, activeClassId, isLoading: classLoading, error: classError } = useActiveClass();
  const [searchParams, setSearchParams] = useSearchParams();
  const rankingCategory = searchParams.get("category") === "ibadah" ? "ibadah" : "total";
  const [dates, setDates] = useState(() => periodDates(searchParams.get("period") === "week" ? "week" : "month"));
  const [downloading, setDownloading] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState<number | null>(null);
  const [selectedPoster, setSelectedPoster] = useState<PosterStudent | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const cid = activeClientId || user?.clientId || "";
  const token = accessToken ?? "";
  const query = { ...dates, classId: activeClassId, limit: 100 };
  const enabled = !!cid && !!token && !!activeClassId;
  const { data: ibadahResponse, isLoading: loadingIbadah, error: errorIbadah } = useBestPerformers({ clientId: cid, token }, query, { enabled });
  const { data: overallResponse, isLoading: loadingOverall, error: errorOverall } = useOverallBestStudents({ clientId: cid, token }, query, { enabled });
  const isOverall = rankingCategory === "total";
  const isLoading = classLoading || (enabled && (isOverall ? loadingOverall : loadingIbadah));
  const error = classError ?? (isOverall ? errorOverall : errorIbadah);
  const overallData = overallResponse?.performers ?? [];
  const ibadahData = ibadahResponse?.performers ?? [];
  const topOverall = overallData[0];
  const topIbadah = ibadahData[0];
  const performerCount = isOverall ? overallData.length : ibadahData.length;
  const presets = commonRangePreset().map((preset, index) => ({ ...preset, label: lang === "ml" ? ["കഴിഞ്ഞ 7 ദിവസം", "ഈ മാസം", "കഴിഞ്ഞ മാസം", "കഴിഞ്ഞ 90 ദിവസം"][index] : preset.label }));
  const dateRange = `${new Date(`${dates.from}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${dates.to}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  const listTitle = lang === "ml" ? "മികച്ച വിദ്യാർത്ഥികൾ" : "Best Students";
  const posterStudents: PosterStudent[] = isOverall
    ? overallData.slice(0, 3).map((student, index) => ({ name: student.name, photoUrl: ibadahData.find((entry) => entry.studentId === student.studentId)?.photoUrl, rank: index + 1, scorePercentage: student.totalPercentage }))
    : ibadahData.slice(0, 3).map((student, index) => ({ name: student.name, photoUrl: student.photoUrl, rank: index + 1, scorePercentage: student.scorePercentage }));

  const selectCategory = (category: string) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set("category", category);
    return next;
  }, { replace: true });

  const handleDownload = async () => {
    if (!performerCount || downloading) return;
    setDownloading(true);
    try {
      await downloadBestPerformanceReport({ category: rankingCategory, className: activeClass?.name || "Class", from: dates.from, to: dates.to, overall: overallData, ibadah: ibadahData });
    } catch (reportError) {
      console.error("Failed to create best performance report", reportError);
      toast.error(lang === "ml" ? "റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യാനായില്ല" : "Could not download the report");
    } finally {
      setDownloading(false);
    }
  };

  const handlePosterDownload = async (student: PosterStudent) => {
    if (downloadingPoster !== null) return;
    setDownloadingPoster(student.rank);
    try {
      flushSync(() => setSelectedPoster(student));
      const element = posterRef.current?.firstElementChild as HTMLElement | null;
      if (!element) throw new Error("Poster is unavailable");
      await document.fonts.ready;
      await Promise.all(Array.from(element.querySelectorAll("img")).map((image) => image.decode().catch(() => undefined)));
      const { snapdom } = await import("@zumer/snapdom");
      const result = await snapdom(element, { scale: 2 });
      const safeName = student.name.normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || `student-${student.rank}`;
      await result.download({ format: "png", filename: `best-performance-${rankingCategory}-${student.rank}-${safeName}.png` });
    } catch (posterError) {
      console.error("Failed to create best performance poster", posterError);
      toast.error(lang === "ml" ? "പോസ്റ്റർ ഡൗൺലോഡ് ചെയ്യാനായില്ല" : "Could not download the poster");
    } finally {
      setDownloadingPoster(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title={isOverall ? (lang === "ml" ? "ആകെ മികച്ച വിദ്യാർത്ഥി റാങ്കിംഗ്" : "Overall Best Student Ranking") : (lang === "ml" ? "മികച്ച ഇബാദത്ത്" : "Best Ibadah Performance")} />
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
        <div className="space-y-5">
          <Tabs className="fixed bottom-16 left-1/2 z-30 -translate-x-1/2 lg:bottom-6 lg:left-[calc(50%+8rem)]" value={rankingCategory} onValueChange={selectCategory}>
            <TabsList aria-label={lang === "ml" ? "റാങ്കിംഗ് വിഭാഗം" : "Ranking category"} className="h-auto bg-primary-50 p-1 text-primary-300 shadow-lg border-[0.5px] border-white">
              <TabsTrigger value="total" className="px-5 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-none">{lang === "ml" ? "ആകെ സ്കോർ" : "Overall"}</TabsTrigger>
              <TabsTrigger value="ibadah" className="px-5 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-none">{lang === "ml" ? "ഇബാദത്ത്" : "Ibadah"}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-3"><ScrollableRangeNavigator from={dates.from} to={dates.to} onChange={setDates} presets={presets} title={lang === "ml" ? "കാലയളവ് തിരഞ്ഞെടുക്കുക" : "Choose period"} /><p className="text-xs text-gray-500">{dateRange}</p></div>
        </div>

        {isLoading && <div className="space-y-5"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-48 rounded-3xl" /></div>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
        {!isLoading && !error && !activeClassId && <p className="rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500">{lang === "ml" ? "ക്ലാസ് ലഭ്യമല്ല" : "No class available"}</p>}

        {!isLoading && !error && activeClassId && (
          <>
            {isOverall ? topOverall && (
              <ScoreHero name={topOverall.name} className={topOverall.className || activeClass?.name} photoUrl={ibadahData.find((student) => student.studentId === topOverall.studentId)?.photoUrl} rank={`${lang === "ml" ? "റാങ്ക്" : "Rank"} ${topOverall.rank}/${overallData.length}`} score={topOverall.totalScore} percentage={topOverall.totalPercentage} scoreLabel={lang === "ml" ? "സ്കോർ" : "Score"} heading={lang === "ml" ? "ക്ലാസിലെ മികച്ച വിദ്യാർത്ഥി" : "Top student in your class"}>
                {[
                  { label: lang === "ml" ? "ഹാജർ" : "Attendance", score: topOverall.attendance.score, maxScore: topOverall.attendance.maxScore, detail: `${topOverall.attendance.rate}% · ${topOverall.attendance.presentDays}/${topOverall.attendance.totalDays}`, icon: CalendarDays, tone: "bg-linear-120 from-white via-white  to-primary-50 text-primary-700" },
                  { label: lang === "ml" ? "ഹോംവർക്ക്" : "Homework", score: topOverall.homework.score, maxScore: topOverall.homework.maxScore, detail: `${topOverall.homework.rate}% · ${topOverall.homework.completed}/${topOverall.homework.assigned}`, icon: BookOpen, tone: "bg-linear-120 from-white via-white to-sky-50/40 text-sky-700" },
                  { label: lang === "ml" ? "പരീക്ഷ" : "Exams", score: topOverall.exam.score, maxScore: topOverall.exam.maxScore, detail: `${topOverall.exam.averagePercentage}% · ${topOverall.exam.examsCount}`, icon: GraduationCap, tone: "bg-linear-120 from-white via-white to-amber-50 text-amber-700" },
                  { label: lang === "ml" ? "ഇബാദത്ത്" : "Ibadah", score: topOverall.ibadah.score, maxScore: topOverall.ibadah.maxScore, detail: `${topOverall.ibadah.percentage}% · ${topOverall.ibadah.totalPrayers} ${lang === "ml" ? "നമസ്കാരങ്ങൾ" : "prayers"}`, icon: Heart, tone: "bg-linear-120 from-white via-white to-violet-50/40 text-violet-700" },
                ].filter((pillar) => pillar.maxScore > 0).map((pillar) => <div key={pillar.label} className={cn("min-w-0 p-4 sm:p-5", pillar.tone)}><div className="flex items-center gap-1.5 text-xs font-medium"><pillar.icon className="size-4 shrink-0" aria-hidden="true" />{pillar.label}</div><p className="mt-3 text-2xl font-bold leading-none tabular-nums text-gray-950 sm:text-3xl">{pillar.score}<span className="ml-0.5 text-xs font-normal text-gray-500">/{pillar.maxScore}</span></p><p className="mt-2 break-words text-xs leading-relaxed text-gray-600">{pillar.detail}</p></div>)}
              </ScoreHero>
            ) : topIbadah && (
              <div className="space-y-4">
                <ScoreHero name={topIbadah.name} className={activeClass?.name} photoUrl={topIbadah.photoUrl} rank={`${lang === "ml" ? "റാങ്ക്" : "Rank"} 1/${ibadahData.length}`} score={topIbadah.score} percentage={topIbadah.scorePercentage} scoreLabel={lang === "ml" ? "സ്കോർ" : "Score"} heading={lang === "ml" ? "ക്ലാസിലെ മികച്ച ഇബാദത്ത് പ്രകടനം" : "Top Ibadah performance in your class"}>
                  {[
                    { label: lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers", value: topIbadah.totalPrayers, icon: Heart, tone: "bg-linear-120 from-white via-white to-primary-50/40 text-primary-700" },
                    { label: lang === "ml" ? "പേജുകൾ" : "Pages", value: topIbadah.totalQuranPages, icon: BookOpen, tone: "bg-linear-120 from-white via-white to-sky-50/40 text-sky-700" },
                    { label: lang === "ml" ? "സ്ട്രീക്ക്" : "Streak", value: `${topIbadah.streak}d`, icon: Flame, tone: "bg-linear-120 from-white via-white to-amber-50/40 text-amber-700" },
                    { label: lang === "ml" ? "സ്ഥിരത" : "Consistency", value: `${topIbadah.consistency}%`, icon: Target, tone: "bg-linear-120 from-white via-white to-violet-50/40 text-violet-700" },
                  ].map((stat) => <div key={stat.label} className={cn("min-w-0 p-4 sm:p-5", stat.tone)}><div className="flex items-center gap-1.5 text-xs font-medium"><stat.icon className="size-4 shrink-0" aria-hidden="true" />{stat.label}</div><p className="mt-3 text-2xl font-bold leading-none tabular-nums text-gray-950 sm:text-3xl">{stat.value}</p></div>)}
                </ScoreHero>
                {Object.entries(topIbadah.customCounts ?? {}).some(([, value]) => value > 0) && <p className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-xs leading-relaxed text-gray-600">{Object.entries(topIbadah.customCounts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${value} ${ibadahResponse?.customItems?.find((item) => item.key === key)?.label ?? key}`).join(" · ")}</p>}
              </div>
            )}

            <ReportCard category={rankingCategory} lang={lang} count={performerCount} downloading={downloading} onDownload={handleDownload} onPosters={() => setPosterOpen(true)} />

            <ResponsivePopover
              open={posterOpen}
              onOpenChange={setPosterOpen}
              compact
              title={lang === "ml" ? "വിദ്യാർത്ഥിയുടെ പോസ്റ്റർ തിരഞ്ഞെടുക്കുക" : "Choose a student poster"}
             >
              <div className="divide-y  divide-gray-100 mb-6 border border-gray-100 mx-2 rounded-2xl bg-white ">
                {posterStudents.map((student) => (
                  <div key={`${rankingCategory}-${student.rank}`} className="flex items-center gap-3     p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{student.rank}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-950">{student.name}</p><p className="text-xs text-gray-500">{(lang === "ml" ? ["ഒന്നാം സ്ഥാനം", "രണ്ടാം സ്ഥാനം", "മൂന്നാം സ്ഥാനം"] : ["First", "Second", "Third"])[student.rank - 1]} · {Number.isFinite(student.scorePercentage) ? Math.round(student.scorePercentage) : 0}%</p></div>
                    <Button type="button" size="xs" onClick={() => void handlePosterDownload(student)} disabled={downloadingPoster !== null} className="gap-1.5">
                      {downloadingPoster === student.rank ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                      {lang === "ml" ? "ഡൗൺലോഡ്" : "Download"}
                    </Button>
                  </div>
                ))}
              </div>
            </ResponsivePopover>

            {selectedPoster && <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true" ref={posterRef}>
              <BestPerformancePoster key={`${rankingCategory}-${selectedPoster.rank}-${selectedPoster.name}`} student={selectedPoster} category={rankingCategory} className={activeClass?.name || "Class"} madrasaName={user?.madrasaName || "Smart Madrasa"} madrasaLogo={user?.madrasaLogo} dateRange={dateRange} />
            </div>}

            <section aria-label={listTitle} className="mb-10">
              <div className="mb-3 flex items-center gap-3"><h2 className="min-w-0 flex-1 text-base font-semibold text-gray-950">{listTitle}</h2><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{performerCount}</span></div>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {performerCount === 0 ? <p className="p-6 text-center text-sm text-gray-500">{lang === "ml" ? "ഈ കാലയളവിലെ വിവരങ്ങൾ ലഭ്യമല്ല" : "No performance records found for this period"}</p>
                  : isOverall ? overallData.map((performer) => (
                    <div key={performer.studentId} className="flex items-center gap-4 bg-white px-4 py-3 sm:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-950">{performer.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{performer.className} · {performer.adno}</p>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                          {performer.attendance.maxScore > 0 && <BestPerformanceMetric icon={CalendarDays} iconClassName="text-primary-700" label={lang === "ml" ? "ഹാജർ" : "Attendance"} value={`${performer.attendance.score}/${performer.attendance.maxScore}`} />}
                          {performer.homework.maxScore > 0 && <BestPerformanceMetric icon={BookOpen} iconClassName="text-sky-700" label={lang === "ml" ? "ഹോംവർക്ക്" : "Homework"} value={`${performer.homework.score}/${performer.homework.maxScore}`} />}
                          {performer.exam.maxScore > 0 && <BestPerformanceMetric icon={GraduationCap} iconClassName="text-amber-700" label={lang === "ml" ? "പരീക്ഷ" : "Exams"} value={`${performer.exam.score}/${performer.exam.maxScore}`} />}
                          {performer.ibadah.maxScore > 0 && <BestPerformanceMetric icon={Heart} iconClassName="text-violet-700" label={lang === "ml" ? "ഇബാദത്ത്" : "Ibadah"} value={`${performer.ibadah.score}/${performer.ibadah.maxScore}`} />}
                        </p>
                      </div>
                      <div className="shrink-0 text-lg font-semibold tabular-nums text-gray-950">{performer.totalScore}/ <div className="text-xs font-normal text-gray-400">{totalMaxScore(performer)}</div></div>
                    </div>
                  )) : ibadahData.map((performer) => (
                    <div key={performer.studentId} className="flex items-center gap-4 bg-white px-4 py-3 sm:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-950">{performer.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{performer.adno}</p>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                          <BestPerformanceMetric icon={Heart} iconClassName="text-primary-700" label={lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers"} value={performer.totalPrayers} />
                          <BestPerformanceMetric icon={BookOpen} iconClassName="text-sky-700" label={lang === "ml" ? "പേജുകൾ" : "Pages"} value={performer.totalQuranPages} />
                          <BestPerformanceMetric icon={Flame} iconClassName="text-amber-700" label={lang === "ml" ? "സ്ട്രീക്ക്" : "Streak"} value={`${performer.streak}d`} />
                          <BestPerformanceMetric icon={Target} iconClassName="text-violet-700" label={lang === "ml" ? "സ്ഥിരത" : "Consistency"} value={`${performer.consistency}%`} />
                        </p>
                      </div>
                      <strong className="shrink-0 text-lg font-semibold tabular-nums text-gray-950">{performer.score}</strong>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
