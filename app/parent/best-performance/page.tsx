import { useState } from "react";
import { Icon } from "@iconify/react";
import { BookOpen, CalendarDays, Flame, GraduationCap, Heart, Target } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BestPerformanceMetric } from "@/components/BestPerformanceMetric";
import { ScrollableRangeNavigator, commonRangePreset, formatRangeDate } from "@/components/ScrollableRangeNavigator";
import { PerformanceHistoryCharts } from "@/components/parent/PerformanceHistoryCharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OverallBestPerformer } from "@/lib/best-performance-api";
import { periodDates } from "@/lib/best-performance-period";
import { formatCompactNumber } from "@/lib/format-compact-number";
import { useBestPerformers, useOverallBestStudents } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";

function totalMaxScore(performer: OverallBestPerformer) {
  return (performer.attendance.maxScore + performer.homework.maxScore + performer.exam.maxScore + performer.ibadah.maxScore) || 100;
}

function ScoreHero({
  name, className, photoUrl, gender, rank, score, percentage, scoreLabel, heading, illustrated = false, children,
}: {
  name: string;
  className?: string;
  photoUrl?: string | null;
  gender?: string;
  rank: string;
  score: number;
  percentage: number;
  scoreLabel: string;
  heading: string;
  illustrated?: boolean;
  children: React.ReactNode;
}) {
  const progress = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;

  return (
    <section className="overflow-hidden rounded-2xl bg-white" aria-label={heading}>
      <div
        className="bg-gradient-to-br from-white via-primary-50/30 to-white px-4 pb-7 pt-5 sm:px-6 rounded-t-2xl"
        style={illustrated ? {
          backgroundImage: "linear-gradient(rgb(255 255 255 / 0.78), rgb(255 255 255 / 0.78)), url('/imgs/teacher/dashboard-corner-primary.png')",
          backgroundPosition: "center, right bottom",
          backgroundSize: "cover, min(80%, 30rem) auto",
          backgroundRepeat: "no-repeat",
        } : undefined}
      >
        <div className="flex items-center gap-3">
          <StudentAvatar name={name} photoUrl={photoUrl} gender={gender} size="lg" className="size-11 ring-2 ring-primary-100" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-gray-950">{name}</p>
            {className && <p className="mt-0.5 text-xs text-gray-600">{className}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-primary-800">{rank}</span>
        </div>
        <div className="flex flex-col items-center pt-7">
          <div className="flex size-40 items-center justify-center rounded-full bg-white/70 p-2" role="img" aria-label={`${scoreLabel}: ${score}`}>
            <div className="flex size-full items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${progress}%, #e5e7eb 0)` }}>
              <div className="flex size-30 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-bold leading-none tabular-nums text-gray-950">{formatCompactNumber(score)}</span>
                <span className="mt-1 text-xs font-medium text-gray-500">{scoreLabel}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-800">{heading}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100">{children}</div>
    </section>
  );
}

export default function ParentBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const [rankingCategory, setRankingCategory] = useState<"total" | "ibadah">("total");
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [dates, setDates] = useState(() => periodDates("month"));

  const ids = user?.accessibleStudentIds ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";
  const activeStudent = user?.accessibleStudents?.find((student) => student.id === activeId);
  const classId = activeStudent?.classId ?? undefined;
  const gender = activeStudent?.gender ?? undefined;
  const presets = commonRangePreset().map((preset, index) => ({
    ...preset,
    label: lang === "ml"
      ? ["കഴിഞ്ഞ 7 ദിവസം", "ഈ മാസം", "കഴിഞ്ഞ മാസം", "കഴിഞ്ഞ 90 ദിവസം"][index]
      : preset.label,
  }));
  const query = { ...dates, limit: 100, ...(classId && { classId }), ...(gender && { gender }) };
  const { data: ibadahResponse, isLoading: loadingIbadah, error: errorIbadah } = useBestPerformers({ clientId: cid, token }, query);
  const { data: overallResponse, isLoading: loadingOverall, error: errorOverall } = useOverallBestStudents({ clientId: cid, token }, query);

  const isOverall = rankingCategory === "total";
  const isLoading = isOverall ? loadingOverall : loadingIbadah;
  const error = isOverall ? errorOverall : errorIbadah;
  const overallData = overallResponse?.performers ?? [];
  const ibadahData = ibadahResponse?.performers ?? [];
  const childOverall = overallData.find((performer) => performer.studentId === activeId);
  const childIbadah = ibadahData.find((performer) => performer.studentId === activeId);
  const performerCount = isOverall ? overallData.length : ibadahData.length;
  const dateRange = `${new Date(`${dates.from}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${dates.to}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  const selectRange = (range: { from: string; to: string }) => {
    setDates(range);
    const isWeek = formatRangeDate(presets[0].from) === range.from && formatRangeDate(presets[0].to) === range.to;
    setPeriodType(isWeek ? "week" : "month");
  };

  const listTitle = isOverall
    ? (lang === "ml" ? "മികച്ച വിദ്യാർത്ഥികൾ" : "Best Students")
    : t("parentPages", "bestPerformers", lang);

  return (
    <DashboardLayout>
      <PageHeader hideSwitcherChevron title={isOverall
        ? (lang === "ml" ? "ആകെ മികച്ച വിദ്യാർത്ഥി റാങ്കിംഗ്" : "Overall Best Student Ranking")
        : t("parentPages", "bestIbadahPerf", lang)} />
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
        <div className="space-y-5">
          <Tabs className="fixed bottom-12 left-1/2 -translate-1/2  z-12 " value={rankingCategory} onValueChange={(value) => setRankingCategory(value as "total" | "ibadah")}>
            <TabsList aria-label={lang === "ml" ? "റാങ്കിംഗ് വിഭാഗം" : "Ranking category"}
              className="h-auto shadow-lg  bg-primary-50 text-primary-300 p-1  border-[0.5px] border-white">
              <TabsTrigger value="total" className="  px-5 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-none">
                {lang === "ml" ? "ആകെ സ്കോർ" : "Overall"}
              </TabsTrigger>
              <TabsTrigger value="ibadah" className="  px-5 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-none">
                {lang === "ml" ? "ഇബാദത്ത്" : "Ibadah"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-3">
            
            <ScrollableRangeNavigator
              from={dates.from}
              to={dates.to}
              onChange={selectRange}
              presets={presets}
              title={lang === "ml" ? "കാലയളവ് തിരഞ്ഞെടുക്കുക" : "Choose period"}
            />
            <p className="text-xs text-gray-500">{dateRange}</p>
          </div>
        </div>

        {isLoading && <div className="space-y-5"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-48 rounded-3xl" /></div>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}

        {!isLoading && !error && (
          <>
            {isOverall ? (
              childOverall ? (
                <div className="space-y-4 bg-white">
                  <ScoreHero
                    name={childOverall.name}
                    photoUrl={activeStudent?.photoUrl ?? childIbadah?.photoUrl}
                    gender={activeStudent?.gender}
                    className={childOverall.className}
                    rank={`${t("parentPages", "rankLabel", lang)} ${childOverall.rank}/${overallData.length}`}
                    score={childOverall.totalScore}
                    percentage={childOverall.totalPercentage}
                    scoreLabel={t("parentPages", "scoreLabel", lang)}
                    heading={lang === "ml" ? "കുട്ടിയുടെ പ്രകടനം" : "Your child's performance"}
                    illustrated
                  >
                    {[
                      { label: lang === "ml" ? "ഹാജർ" : "Attendance", score: childOverall.attendance.score, maxScore: childOverall.attendance.maxScore, detail: `${childOverall.attendance.rate}% · ${childOverall.attendance.presentDays}/${childOverall.attendance.totalDays}`, icon: CalendarDays, tone: "bg-linear-120 via-white from-white to-primary-50 text-primary-700" },
                      { label: lang === "ml" ? "ഹോംവർക്ക്" : "Homework", score: childOverall.homework.score, maxScore: childOverall.homework.maxScore, detail: `${childOverall.homework.rate}% · ${childOverall.homework.completed}/${childOverall.homework.assigned}`, icon: BookOpen, tone: "bg-linear-120 via-white from-white to-sky-50/40 text-sky-700" },
                      { label: lang === "ml" ? "പരീക്ഷ" : "Exams", score: childOverall.exam.score, maxScore: childOverall.exam.maxScore, detail: `${childOverall.exam.averagePercentage}% · ${childOverall.exam.examsCount}`, icon: GraduationCap, tone: "bg-linear-120 via-white from-white to-amber-50 text-amber-700" },
                      { label: lang === "ml" ? "ഇബാദത്ത്" : "Ibadah", score: childOverall.ibadah.score, maxScore: childOverall.ibadah.maxScore, detail: `${childOverall.ibadah.percentage}% · ${childOverall.ibadah.totalPrayers} ${t("parentPages", "prayersLabel", lang)}`, icon: Heart, tone: "bg-linear-120 via-white from-white to-violet-50/40 text-violet-700" },
                    ].filter((pillar) => pillar.maxScore > 0).map((pillar) => (
                      <div key={pillar.label} className={cn("min-w-0 p-4 sm:p-5", pillar.tone)}>
                        <div className="flex items-center gap-1.5 text-xs font-medium"><pillar.icon className="size-4 shrink-0" aria-hidden="true" />{pillar.label}</div>
                        <p className="mt-3 text-2xl font-bold leading-none tabular-nums text-gray-950 sm:text-3xl">{pillar.score}<span className="ml-0.5 text-xs font-normal text-gray-500">/{pillar.maxScore}</span></p>
                        <p className="mt-2 break-words text-xs leading-relaxed text-gray-600">{pillar.detail}</p>
                      </div>
                    ))}
                  </ScoreHero>
                </div>
              ) : <p className="rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500">{lang === "ml" ? "ഈ കാലയളവിൽ കുട്ടിയുടെ വിവരങ്ങൾ ലഭ്യമല്ല" : "No performance records found for your child in this period"}</p>
            ) : (
              childIbadah ? (
                <div className="space-y-4">
                  <ScoreHero
                    name={childIbadah.name}
                    photoUrl={activeStudent?.photoUrl ?? childIbadah.photoUrl}
                    gender={activeStudent?.gender}
                    rank={`${t("parentPages", "rankLabel", lang)} ${ibadahData.findIndex((performer) => performer.studentId === activeId) + 1}/${ibadahData.length}`}
                    score={childIbadah.score}
                    percentage={childIbadah.scorePercentage}
                    scoreLabel={t("parentPages", "scoreLabel", lang)}
                    heading={lang === "ml" ? "കുട്ടിയുടെ ഇബാദത്ത് പ്രകടനം" : "Your child's Ibadah performance"}
                    illustrated
                  >
                    {[
                      { label: t("parentPages", "prayersLabel", lang), value: childIbadah.totalPrayers, icon: Heart, tone: "from-white via-white bg-linear-120 to-primary-50/40 text-primary-700" },
                      { label: t("parentPages", "pagesLabel", lang), value: childIbadah.totalQuranPages, icon: BookOpen, tone: "from-white via-white bg-linear-120 to-sky-50/40 text-sky-700" },
                      { label: t("parentPages", "streakLabel", lang), value: `${childIbadah.streak}d`, icon: Flame, tone: "from-white via-white bg-linear-120 to-amber-50/40 text-amber-700" },
                      { label: t("parentPages", "consistencyLabel", lang), value: `${childIbadah.consistency}%`, icon: Target, tone: "from-white via-white bg-linear-120 to-violet-50/40 text-violet-700" },
                    ].map((stat) => <div key={stat.label} className={cn("min-w-0 p-4 sm:p-5", stat.tone)}><div className="flex items-center gap-1.5 text-xs font-medium"><stat.icon className="size-4 shrink-0" aria-hidden="true" />{stat.label}</div><p className="mt-3 text-2xl font-bold leading-none tabular-nums text-gray-950 sm:text-3xl">{stat.value}</p></div>)}
                    {Object.entries(childIbadah.customCounts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => {
                      const item = ibadahResponse?.customItems?.find((customItem) => customItem.key === key);
                      return <div key={key} className="min-w-0 bg-linear-120 from-white via-white to-fuchsia-50/40 p-4 text-fuchsia-700 sm:p-5"><div className="flex items-center gap-1.5 text-xs font-medium"><Icon icon={item?.icon || "lucide:hash"} className="size-4 shrink-0" aria-hidden="true" />{item?.label ?? key}</div><p className="mt-3 text-2xl font-bold leading-none tabular-nums text-gray-950 sm:text-3xl">{value}</p></div>;
                    })}
                  </ScoreHero>
                </div>
              ) : <p className="rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500">{lang === "ml" ? "ഈ കാലയളവിൽ കുട്ടിയുടെ വിവരങ്ങൾ ലഭ്യമല്ല" : "No performance records found for your child in this period"}</p>
            )}

            <section aria-label={listTitle} className="mb-10">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="min-w-0 flex-1 text-base font-semibold text-gray-950">{listTitle}</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{performerCount}</span>
              </div>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  {performerCount === 0 ? <p className="p-2 text-center text-sm text-gray-500">{lang === "ml" ? "ഈ കാലയളവിലെ വിവരങ്ങൾ ലഭ്യമല്ല" : "No performance records found for this period"}</p>
                    : isOverall ? overallData.map((performer) => (
                      <div key={performer.studentId} className={cn("bg-white flex items-center gap-4 p-2 px-4  sm:px-6", ids.includes(performer.studentId) && "")}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-950">{performer.name}{ids.includes(performer.studentId) && <span className="ml-2 text-xs font-medium text-primary-700">{t("parentPages", "myChildBestPerf", lang)}</span>}</p>
                          <p className="mt-1 text-xs text-gray-500">{performer.className} · {performer.adno}</p>
                          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                            {performer.attendance.maxScore > 0 && <BestPerformanceMetric icon={CalendarDays} iconClassName="text-primary-700" label={lang === "ml" ? "ഹാജർ" : "Attendance"} value={`${performer.attendance.score}/${performer.attendance.maxScore}`} />}
                            {performer.homework.maxScore > 0 && <BestPerformanceMetric icon={BookOpen} iconClassName="text-sky-700" label={lang === "ml" ? "ഹോംവർക്ക്" : "Homework"} value={`${performer.homework.score}/${performer.homework.maxScore}`} />}
                            {performer.exam.maxScore > 0 && <BestPerformanceMetric icon={GraduationCap} iconClassName="text-amber-700" label={lang === "ml" ? "പരീക്ഷ" : "Exams"} value={`${performer.exam.score}/${performer.exam.maxScore}`} />}
                            {performer.ibadah.maxScore > 0 && <BestPerformanceMetric icon={Heart} iconClassName="text-violet-700" label={lang === "ml" ? "ഇബാദത്ത്" : "Ibadah"} value={`${performer.ibadah.score}/${performer.ibadah.maxScore}`} />}
                          </p>
                        </div>
                        <strong className="shrink-0 text-lg font-semibold tabular-nums text-gray-950">{performer.totalScore}<span className="text-xs font-normal text-gray-400">/{totalMaxScore(performer)}</span></strong>
                      </div>
                    )) : ibadahData.map((performer) => (
                      <div key={performer.studentId} className={cn("bg-white flex items-center gap-4 p-2  px-4 sm:px-6", ids.includes(performer.studentId) && "")}>
                         <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-950">{performer.name}{ids.includes(performer.studentId) && <span className="ml-2 text-xs font-medium text-primary-700">{t("parentPages", "myChildBestPerf", lang)}</span>}</p>
                          <p className="mt-1 text-xs text-gray-500">{performer.adno}</p>
                          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                            <BestPerformanceMetric icon={Heart} iconClassName="text-primary-700" label={t("parentPages", "prayersLabel", lang)} value={performer.totalPrayers} />
                            <BestPerformanceMetric icon={BookOpen} iconClassName="text-sky-700" label={t("parentPages", "pagesLabel", lang)} value={performer.totalQuranPages} />
                            <BestPerformanceMetric icon={Flame} iconClassName="text-amber-700" label={t("parentPages", "streakLabel", lang)} value={`${performer.streak}d`} />
                            <BestPerformanceMetric icon={Target} iconClassName="text-violet-700" label={t("parentPages", "consistencyLabel", lang)} value={`${performer.consistency}%`} />
                          </p>
                         </div>
                        <strong className="shrink-0 text-lg font-semibold tabular-nums text-gray-950">{performer.score}</strong>
                      </div>
                    ))}
                </div>
            </section>

            {!isOverall && activeId && cid && token && <PerformanceHistoryCharts clientId={cid} token={token} studentId={activeId} lang={lang} periodType={periodType} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
