import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { BestPerformerCard } from "@/components/parent/BestPerformerCard";
import { PerformanceHistoryCharts } from "@/components/parent/PerformanceHistoryCharts";
import { periodDates } from "@/lib/best-performance-period";
import { Skeleton } from "@/components/ui/Skeleton";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { motion, useReducedMotion } from "framer-motion";
import "swiper/css";
import "swiper/css/pagination";
import {
  Calendar,
  Trophy,
  Star,
  BookOpen,
  Flame,
  Target,
  Medal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { useRef, useState } from "react";
import { useBestPerformers, useOverallBestStudents } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function ParentBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [rankingCategory, setRankingCategory] = useState<"total" | "ibadah">("total");
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [customRange, setCustomRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [rangeStep, setRangeStep] = useState<"from" | "to" | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [showAllPerformers, setShowAllPerformers] = useState(true);

  const reduceMotion = useReducedMotion();
  const printRef = useRef<HTMLDivElement>(null);
  const advancingRangeRef = useRef(false);

  const ids = user?.accessibleStudentIds ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";
  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === activeId);
  const classId = activeStudent?.classId ?? undefined;
  const gender = activeStudent?.gender ?? undefined;

  const dates = customRange ?? periodDates(periodType);

  // 1. Ibadah performance query
  const {
    data: ibadahResponse,
    isLoading: loadingIbadah,
    error: errorIbadah,
  } = useBestPerformers(
    { clientId: cid, token },
    { ...dates, limit: 100, ...(classId && { classId }), ...(gender && { gender }) },
  );

  // 2. Overall best performance query
  const {
    data: overallResponse,
    isLoading: loadingOverall,
    error: errorOverall,
  } = useOverallBestStudents(
    { clientId: cid, token },
    { ...dates, limit: 100, ...(classId && { classId }), ...(gender && { gender }) },
  );

  const isLoading = rankingCategory === "total" ? loadingOverall : loadingIbadah;
  const error = rankingCategory === "total" ? errorOverall : errorIbadah;

  const response = rankingCategory === "total" ? overallResponse : ibadahResponse;
  const data = ibadahResponse?.performers ?? [];
  const overallData = overallResponse?.performers ?? [];
  const performers = data;
  const period = response?.period ?? null;
  const customItems = ibadahResponse?.customItems ?? [];

  const medalEmoji = ["🥇", "🥈", "🥉"];

  const rankOf = (sid: string) => {
    const idx = data.findIndex((p) => p.studentId === sid);
    return idx === -1 ? null : idx + 1;
  };

  const topPerformer = data[0] ?? null;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score, 0) / data.length) : 0;

  const activeChildInList = data.find((p) => p.studentId === activeId);
  const activeChildOverall = overallData.find((p) => p.studentId === activeId);

  const child = activeChildInList;
  const childRank = child
    ? performers.findIndex(
        (performer) => performer.studentId === child.studentId,
      ) + 1
    : null;
  const topScore = performers[0]?.score ?? 0;
  const averageScore = performers.length
    ? Math.round(
        performers.reduce((sum, performer) => sum + performer.score, 0) /
          performers.length,
      )
    : 0;
  const streak = child?.streak ?? 0;

  const summary = [
    { label: t("parentPages", "scoreLabel", lang), value: child?.score ?? "—" },
    {
      label: t("parentPages", "avgLabel", lang),
      value: performers.length ? averageScore : "—",
    },
    {
      label: t("parentPages", "topLabel", lang),
      value: performers.length ? topScore : "—",
    },
    {
      label: t("parentPages", "gapLabel", lang),
      value: child ? Math.max(0, topScore - child.score) : "—",
    },
    {
      label: t("parentPages", "rankLabel", lang),
      value: childRank ? `#${childRank}/${performers.length}` : "—",
    },
    {
      label: lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers",
      value: child?.totalPrayers ?? "—",
    },
    {
      label: lang === "ml" ? "ഖുർആൻ പേജുകൾ" : "Quran pages",
      value: child?.totalQuranPages ?? "—",
    },
    {
      label: t("parentPages", "consistencyLabel", lang),
      value: child ? `${child.consistency}%` : "—",
    },
  ];

  const dateRange = period
    ? `${new Date(period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const selectPeriod = (type: "week" | "month") => {
    setCustomRange(null);
    setPeriodType(type);
  };

  const selectRangeDate = (selectedDate: string) => {
    if (rangeStep === "from") {
      setRangeStart(selectedDate);
      advancingRangeRef.current = true;
      setRangeStep("to");
    } else if (rangeStep === "to") {
      setCustomRange({
        from: selectedDate < rangeStart ? selectedDate : rangeStart,
        to: selectedDate < rangeStart ? rangeStart : selectedDate,
      });
      setRangeStep(null);
    }
  };

  const SectionHeader = ({
    icon: Icon,
    title,
    count,
  }: {
    icon: typeof Trophy;
    title: string;
    count?: number;
  }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary-700" />
      </div>
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {count}
        </span>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={
          rankingCategory === "total"
            ? (lang === "ml" ? "ആകെ മികച്ച വിദ്യാർത്ഥി റാങ്കിംഗ്" : "Overall Best Student Ranking")
            : t("parentPages", "bestIbadahPerf", lang)
        }
      />
      <div
        ref={printRef}
        className="mx-auto w-full max-w-6xl min-w-0 overflow-hidden !p-0 *:px-4 lg:pb-20 space-y-6"
      >
        {/* Controls: Category & Period Toggles */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setRankingCategory("total")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                rankingCategory === "total"
                  ? "bg-white text-primary-800 shadow-xs"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              <Star className={cn("w-4 h-4", rankingCategory === "total" ? "text-amber-500 fill-amber-500" : "text-gray-400")} />
              <span>{lang === "ml" ? "ആകെ സ്കോർ (Total)" : "Overall Best (Total)"}</span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block",
                rankingCategory === "total" ? "bg-primary-100 text-primary-800" : "bg-gray-200 text-gray-600"
              )}>
                4 Pillars
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRankingCategory("ibadah")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                rankingCategory === "ibadah"
                  ? "bg-white text-primary-800 shadow-xs"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              <Trophy className={cn("w-4 h-4", rankingCategory === "ibadah" ? "text-primary-600" : "text-gray-400")} />
              <span>{lang === "ml" ? "ഇബാദത്ത്" : "Ibadah Ranking"}</span>
            </button>
          </div>

          {/* Period Toggle */}
          <div
            className="inline-flex items-center rounded-full border border-gray-300 bg-white p-1 w-fit shadow-xs"
            role="group"
            aria-label={lang === "ml" ? "കാലയളവ് തിരഞ്ഞെടുക്കുക" : "Choose period"}
          >
            <button
              type="button"
              onClick={() => selectPeriod("month")}
              aria-pressed={!customRange && periodType === "month"}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer",
                !customRange && periodType === "month"
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              {lang === "ml" ? "മാസം" : "Month"}
            </button>
            <button
              type="button"
              onClick={() => selectPeriod("week")}
              aria-pressed={!customRange && periodType === "week"}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer",
                !customRange && periodType === "week"
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              {lang === "ml" ? "ആഴ്ച" : "Week"}
            </button>
            <button
              type="button"
              onClick={() => setRangeStep("from")}
              aria-label={lang === "ml" ? "തീയതി പരിധി തിരഞ്ഞെടുക്കുക" : "Choose date range"}
              aria-pressed={!!customRange}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer",
                customRange
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Calendar className="size-4" />
              <span>{lang === "ml" ? "തീയതികൾ" : "Dates"}</span>
            </button>
          </div>
        </div>

        {/* Period info */}
        {dateRange && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-2xl w-fit text-xs font-semibold text-primary-800">
            <Target className="w-4 h-4 text-primary-600" />
            <span>
              {t("parentPages", "periodLabel", lang)}: {dateRange}
            </span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {error.message}
          </div>
        )}

        {/* Content View */}
        {!isLoading && !error && (
          <div className="space-y-8">
            {rankingCategory === "total" ? (
              <>
                {/* ──────────────────────────────────────────────────────── */}
                {/* SECTION: Overall Performance for Child                    */}
                {/* ──────────────────────────────────────────────────────── */}
                {!activeChildOverall ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xs">
                    <Medal className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-semibold text-sm">
                      {lang === "ml" ? "ഈ കാലയളവിൽ കുട്ടിയുടെ വിവരങ്ങൾ ലഭ്യമല്ല" : "No performance records found for your child in this period"}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-primary-200 p-5 lg:p-6 shadow-xs ring-1 ring-primary-400/30 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
                        {activeChildOverall.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-900 truncate">{activeChildOverall.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{activeChildOverall.adno}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                          {t("parentPages", "rankLabel", lang)}
                        </p>
                        <p className="text-2xl font-black text-primary-600">
                          #{activeChildOverall.rank}
                          <span className="text-sm font-semibold text-gray-400 ml-1">/ {overallData.length}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                          {t("parentPages", "scoreLabel", lang)}
                        </p>
                        <p className="text-4xl font-black text-gray-900">
                          {activeChildOverall.totalScore}<span className="text-lg font-semibold text-gray-400"> / 100</span>
                        </p>
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold px-3 py-1 rounded-full",
                        activeChildOverall.totalScore >= 80 ? "bg-primary-100 text-primary-700" : activeChildOverall.totalScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                      )}>
                        {activeChildOverall.totalPercentage}% · {activeChildOverall.totalScore >= 80 ? "Excellent" : activeChildOverall.totalScore >= 50 ? "Good" : "Needs Improvement"}
                      </span>
                    </div>

                    {/* Composite progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                      <div style={{ width: `${(activeChildOverall.attendance.score / 25) * 25}%` }} className="bg-primary-500 h-full" title="Attendance" />
                      <div style={{ width: `${(activeChildOverall.homework.score / 25) * 25}%` }} className="bg-blue-500 h-full" title="Homework" />
                      <div style={{ width: `${(activeChildOverall.exam.score / 25) * 25}%` }} className="bg-purple-500 h-full" title="Exams" />
                      <div style={{ width: `${(activeChildOverall.ibadah.score / 25) * 25}%` }} className="bg-teal-500 h-full" title="Ibadah" />
                    </div>

                    {/* 4 Pillars Grid for Child */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      <div className="bg-primary-50/70 border border-primary-100 rounded-2xl p-3">
                        <div className="flex items-center justify-between font-bold text-primary-800 text-xs mb-1">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary-600" /> Attendance</span>
                          <span>{activeChildOverall.attendance.score}/25</span>
                        </div>
                        <p className="text-xs font-bold text-primary-900">{activeChildOverall.attendance.rate}% rate</p>
                        <p className="text-[10px] text-primary-600/90 mt-0.5">{activeChildOverall.attendance.presentDays}/{activeChildOverall.attendance.totalDays} days present</p>
                      </div>

                      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3">
                        <div className="flex items-center justify-between font-bold text-blue-800 text-xs mb-1">
                          <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5 text-blue-600" /> Homework</span>
                          <span>{activeChildOverall.homework.score}/25</span>
                        </div>
                        <p className="text-xs font-bold text-blue-900">{activeChildOverall.homework.rate}% completed</p>
                        <p className="text-[10px] text-blue-600/90 mt-0.5">{activeChildOverall.homework.completed}/{activeChildOverall.homework.assigned} tasks</p>
                      </div>

                      <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3">
                        <div className="flex items-center justify-between font-bold text-purple-800 text-xs mb-1">
                          <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-purple-600" /> Exam Marks</span>
                          <span>{activeChildOverall.exam.score}/25</span>
                        </div>
                        <p className="text-xs font-bold text-purple-900">{activeChildOverall.exam.averagePercentage}% average</p>
                        <p className="text-[10px] text-purple-600/90 mt-0.5">{activeChildOverall.exam.examsCount} exams</p>
                      </div>

                      <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-3">
                        <div className="flex items-center justify-between font-bold text-teal-800 text-xs mb-1">
                          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-teal-600" /> Ibadah</span>
                          <span>{activeChildOverall.ibadah.score}/25</span>
                        </div>
                        <p className="text-xs font-bold text-teal-900">{activeChildOverall.ibadah.percentage}% score</p>
                        <p className="text-[10px] text-teal-600/90 mt-0.5">{activeChildOverall.ibadah.totalPrayers} prayers · {activeChildOverall.ibadah.totalQuranPages}p</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Highlights Banner for Overall Best Student */}
                {overallResponse?.highlights && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {overallResponse.highlights.topPerformer && (
                      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 shadow-xs">
                        <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>{lang === "ml" ? "ടോപ്പർ" : "Top Performer"}</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{overallResponse.highlights.topPerformer.name}</p>
                        <p className="text-[11px] text-gray-500">{overallResponse.highlights.topPerformer.className} • {overallResponse.highlights.topPerformer.score} pts</p>
                      </div>
                    )}
                    {overallResponse.highlights.bestAttendance && (
                      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 shadow-xs">
                        <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold mb-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{lang === "ml" ? "ഹാജർ" : "Attendance"}</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{overallResponse.highlights.bestAttendance.name}</p>
                        <p className="text-[11px] text-gray-500">{overallResponse.highlights.bestAttendance.className} • {overallResponse.highlights.bestAttendance.rate}%</p>
                      </div>
                    )}
                    {overallResponse.highlights.bestHomework && (
                      <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 shadow-xs">
                        <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold mb-1">
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>{lang === "ml" ? "ഹോംവർക്ക്" : "Homework"}</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{overallResponse.highlights.bestHomework.name}</p>
                        <p className="text-[11px] text-gray-500">{overallResponse.highlights.bestHomework.className} • {overallResponse.highlights.bestHomework.rate}%</p>
                      </div>
                    )}
                    {overallResponse.highlights.bestExam && (
                      <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 shadow-xs">
                        <div className="flex items-center gap-1.5 text-purple-700 text-xs font-bold mb-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{lang === "ml" ? "പരീക്ഷ" : "Exam Marks"}</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{overallResponse.highlights.bestExam.name}</p>
                        <p className="text-[11px] text-gray-500">{overallResponse.highlights.bestExam.className} • {overallResponse.highlights.bestExam.averagePercentage}%</p>
                      </div>
                    )}
                    {overallResponse.highlights.bestIbadah && (
                      <div className="bg-primary-50/80 border border-primary-200 rounded-2xl p-3 shadow-xs">
                        <div className="flex items-center gap-1.5 text-primary-700 text-xs font-bold mb-1">
                          <Star className="w-3.5 h-3.5" />
                          <span>{lang === "ml" ? "ഇബാദത്ത്" : "Best Ibadah"}</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{overallResponse.highlights.bestIbadah.name}</p>
                        <p className="text-[11px] text-gray-500">{overallResponse.highlights.bestIbadah.className} • {overallResponse.highlights.bestIbadah.percentage}%</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Overall Best Students List */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAllPerformers(!showAllPerformers)}
                    className="w-full flex items-center justify-between mb-4 cursor-pointer"
                  >
                    <SectionHeader
                      icon={Trophy}
                      title={
                        periodType === "week"
                          ? (lang === "ml" ? "ഈ ആഴ്ചയിലെ മികച്ച വിദ്യാർത്ഥികൾ" : "Weekly Best Students")
                          : (lang === "ml" ? "ഈ മാസത്തെ മികച്ച വിദ്യാർത്ഥികൾ" : "Monthly Best Students")
                      }
                      count={overallData.length}
                    />
                    {showAllPerformers
                      ? <ChevronUp className="w-5 h-5 text-gray-400" />
                      : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>

                  {overallData.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xs">
                      <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-semibold">
                        {lang === "ml" ? "ഈ കാലയളവിലെ വിവരങ്ങൾ ലഭ്യമല്ല" : "No performance records found for this period"}
                      </p>
                    </div>
                  ) : showAllPerformers && (
                    <div className="space-y-3">
                      {overallData.map((performer, i) => {
                        const isMyChild = ids.includes(performer.studentId);
                        return (
                          <motion.div
                            key={performer.studentId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn(
                              "bg-white rounded-2xl border p-4 shadow-xs transition-all",
                              isMyChild ? "ring-2 ring-primary-400 bg-primary-50/50 border-primary-200" : "border-gray-100",
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-3xl shrink-0 w-10 text-center font-black text-gray-700">
                                {medalEmoji[i] ?? `#${performer.rank}`}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 text-sm truncate">
                                    {performer.name}
                                  </p>
                                  {isMyChild && (
                                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-200 text-primary-800">
                                      {t("parentPages", "myChildBestPerf", lang)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {performer.adno ? `${performer.adno} • ` : ""}{performer.className}
                                </p>
                                {/* 4 Pillars breakdown */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2.5">
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold">
                                    <Users className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Att: {performer.attendance.rate}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                                    <ClipboardList className="w-3 h-3 shrink-0" />
                                    <span className="truncate">HW: {performer.homework.rate}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-semibold">
                                    <GraduationCap className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Exam: {performer.exam.averagePercentage}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-50 text-primary-700 text-[11px] font-semibold">
                                    <Star className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Ibadah: {performer.ibadah.percentage}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-2xl font-black text-primary-600">
                                  {performer.totalScore}
                                </p>
                                <p className="text-[11px] font-semibold text-gray-400">
                                  / 100 PTS
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 bg-gradient-to-r from-primary-500 via-teal-500 to-indigo-500 rounded-full transition-all duration-700"
                                style={{ width: `${performer.totalPercentage}%` }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* ──────────────────────────────────────────────────────── */}
                {/* SECTION: Ibadah Performance View (Modern UI + Carousel)  */}
                {/* ──────────────────────────────────────────────────────── */}
                <section
                  className="pt-2"
                  aria-label={
                    lang === "ml"
                      ? "പ്രകടന സ്ഥിതിവിവരക്കണക്കുകൾ"
                      : "Performance statistics"
                  }
                >
                  <div className="flex flex-col items-center gap-5 text-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {lang === "ml" ? "ഇബാദത്ത് അവലോകനം" : "Ibadah overview"}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                        {lang === "ml"
                          ? "പ്രകടനം ഒറ്റനോട്ടത്തിൽ"
                          : "Performance at a glance"}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-1.5 overflow-hidden rounded-[22px] lg:grid-cols-[1.06fr_1fr]">
                    <div className="flex min-h-[300px] flex-col items-center justify-center bg-[#f4f6f3] px-6 py-5 text-center sm:min-h-[390px]">
                      <div className="relative h-48 w-full max-w-[380px] sm:h-60">
                        <img
                          src="/icons/best-performance/streak-v2-animated.webp"
                          alt=""
                          className="pointer-events-none absolute inset-0 size-full object-contain motion-reduce:hidden"
                        />
                        <img
                          src="/icons/best-performance/streak-v2.webp"
                          alt=""
                          className="pointer-events-none absolute inset-0 hidden size-full object-contain motion-reduce:block"
                        />
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                          {lang === "ml" ? "തുടർച്ചയായ ദിവസങ്ങൾ" : "Day streak"}
                        </p>
                        <strong className="mt-2 block text-6xl font-semibold leading-none tracking-tight text-primary tabular-nums sm:text-7xl">
                          {streak}
                        </strong>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {summary.map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex min-h-24 min-w-0 flex-col items-center justify-center bg-[#f7f7f7] px-5 py-4 text-center sm:min-h-0 sm:px-6"
                        >
                          <span className="text-xs font-medium text-gray-600">
                            {label}
                          </span>
                          <strong className="mt-2 text-2xl font-semibold leading-none tracking-tight text-gray-950 tabular-nums sm:text-3xl">
                            {value}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* History charts */}
                {activeId && cid && token && (
                  <PerformanceHistoryCharts
                    clientId={cid}
                    token={token}
                    studentId={activeId}
                    lang={lang}
                    periodType={periodType}
                  />
                )}

                {/* Best Performers Carousel */}
                {performers.length === 0 ? (
                  <p className="py-16 text-center text-sm font-medium text-gray-500">
                    {t("parentPages", "noIbadahData", lang)}
                  </p>
                ) : (
                  <motion.section
                    className="mx-auto mt-6 max-w-[480px] overflow-hidden rounded-[30px] bg-primary/5 px-4 py-12 pb-24 sm:px-8"
                    style={{
                      backgroundImage:
                        "linear-gradient(110deg, color-mix(in oklch, var(--primary) 5%, transparent), transparent 55%, color-mix(in oklch, var(--primary) 5%, transparent)), linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)), url('/icons/best-performance/performance-bg.webp')",
                      backgroundSize: "220% 220%, cover, cover",
                      backgroundRepeat: "no-repeat",
                    }}
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            backgroundPosition: [
                              "0% 50%, center, center",
                              "100% 50%, center, center",
                              "0% 50%, center, center",
                            ],
                          }
                    }
                    transition={{
                      duration: 14,
                      ease: "easeInOut",
                      repeat: Infinity,
                    }}
                  >
                    <h2 className="text-center text-2xl font-semibold tracking-tight text-gray-950">
                      {t("parentPages", "bestPerformers", lang)}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                      {lang === "ml"
                        ? `${performers.length} വിദ്യാർത്ഥികൾ`
                        : `${performers.length} performers`}
                    </p>
                    <Swiper
                      key={`${response?.period.from}-${response?.period.to}-${activeId}`}
                      modules={[Pagination]}
                      slidesPerView={1}
                      spaceBetween={16}
                      grabCursor
                      pagination={{ clickable: true, dynamicBullets: true }}
                      className="mx-auto mt-7 w-full max-w-lg [&_.swiper-pagination-bullet]:!size-2.5 [&_.swiper-pagination-bullet-active]:!bg-primary"
                      aria-label={t("parentPages", "bestPerformers", lang)}
                    >
                      {performers.map((performer, index) => (
                        <SwiperSlide key={performer.studentId} className="!h-auto">
                          <BestPerformerCard
                            performer={performer}
                            rank={index + 1}
                            isMyChild={ids.includes(performer.studentId)}
                            customItems={customItems}
                            lang={lang}
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </motion.section>
                )}

                {/* Expandable full list for Ibadah performers */}
                {performers.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAllPerformers(!showAllPerformers)}
                      className="w-full flex items-center justify-between mb-4 cursor-pointer"
                    >
                      <SectionHeader
                        icon={Trophy}
                        title={t("parentPages", "bestPerformers", lang)}
                        count={performers.length}
                      />
                      {showAllPerformers
                        ? <ChevronUp className="w-5 h-5 text-gray-400" />
                        : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>

                    {showAllPerformers && (
                      <div className="space-y-3">
                        {performers.map((performer, i) => {
                          const rank = rankOf(performer.studentId) ?? i + 1;
                          const isMyChild = ids.includes(performer.studentId);
                          return (
                            <motion.div
                              key={performer.studentId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={cn(
                                "bg-white rounded-2xl border p-4 shadow-xs transition-all",
                                isMyChild ? "ring-2 ring-primary-400 bg-primary-50/50 border-primary-200" : "border-gray-100",
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-3xl shrink-0 w-10 text-center">
                                  {medalEmoji[i] ?? "🏅"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900 text-sm truncate">
                                      {performer.name}
                                    </p>
                                    {isMyChild && (
                                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-200 text-primary-800">
                                        {t("parentPages", "myChildBestPerf", lang)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">{performer.adno}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full">
                                      <Star className="w-3 h-3" />
                                      {performer.totalPrayers} {t("parentPages", "prayersLabel", lang)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                                      <BookOpen className="w-3 h-3" />
                                      {performer.totalQuranPages} {t("parentPages", "pagesLabel", lang)}
                                    </span>
                                    {Object.entries(performer.customCounts ?? {}).map(([key, val]) => {
                                      if (!val) return null;
                                      const itemDef = customItems.find((item) => item.key === key);
                                      const label = itemDef?.label ?? key;
                                      return (
                                        <span
                                          key={key}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full"
                                        >
                                          <Sparkles className="w-3 h-3" />
                                          {val} {label}
                                        </span>
                                      );
                                    })}
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">
                                      <Flame className="w-3 h-3" />
                                      {performer.streak}d {t("parentPages", "streakLabel", lang)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                      {performer.consistency}% {t("parentPages", "consistencyLabel", lang)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-2xl font-black text-primary-600">
                                    {performer.score}
                                  </p>
                                  <p className="text-[11px] font-semibold text-gray-400">
                                    {t("parentPages", "scoreUppercase", lang)}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 bg-gradient-to-r from-primary-400 to-teal-400 rounded-full transition-all duration-700"
                                  style={{ width: `${performer.score}%` }}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <DatePickerDrawer
        open={rangeStep !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (advancingRangeRef.current) advancingRangeRef.current = false;
            else setRangeStep(null);
          }
        }}
        date={rangeStep === "to" ? rangeStart : (customRange?.from ?? "")}
        onDateChange={selectRangeDate}
        title={
          rangeStep === "to"
            ? lang === "ml"
              ? "അവസാന തീയതി"
              : "Choose end date"
            : lang === "ml"
              ? "ആരംഭ തീയതി"
              : "Choose start date"
        }
      />
    </DashboardLayout>
  );
}
