import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { useBestPerformers, useOverallBestStudents } from "@/lib/queries";
import {
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
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

const medalEmoji = ["🥇", "🥈", "🥉", "🏅", "🌟", "⭐", "✨", "💫", "🔥", "🌙"];

export default function ParentBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const [rankingCategory, setRankingCategory] = useState<"total" | "ibadah">("total");
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [showAllPerformers, setShowAllPerformers] = useState(true);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids = user?.accessibleStudentIds ?? [];
  const students = user?.accessibleStudents ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";
  const activeStudent = students.find((s) => s.id === activeId);
  const classId = activeStudent?.classId ?? undefined;
  const gender = activeStudent?.gender ?? undefined;

  const getPeriodDates = (type: "week" | "month") => {
    const end = new Date();
    const start = new Date(end);
    if (type === "week") start.setDate(end.getDate() - 6);
    else start.setDate(1);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    return { from: iso(start), to: iso(end) };
  };

  const dates = getPeriodDates(periodType);

  // 1. Ibadah performance query
  const { data: response, isLoading: loadingIbadah, error: errorIbadah } = useBestPerformers(
    { clientId: cid, token },
    { ...dates, limit: 100, ...(classId && { classId }), ...(gender && { gender }) },
  );

  // 2. Overall best performance query
  const { data: overallResponse, isLoading: loadingOverall, error: errorOverall } = useOverallBestStudents(
    { clientId: cid, token },
    { ...dates, limit: 100, ...(classId && { classId }), ...(gender && { gender }) },
  );

  const isLoading = rankingCategory === "total" ? loadingOverall : loadingIbadah;
  const error = rankingCategory === "total" ? errorOverall : errorIbadah;

  const data = response?.performers ?? [];
  const overallData = overallResponse?.performers ?? [];
  const period = rankingCategory === "total" ? (overallResponse?.period ?? null) : (response?.period ?? null);
  const customItems = response?.customItems ?? [];

  const formatDateRange = () => {
    if (!period) return "";
    const from = new Date(period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const to = new Date(period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${from} — ${to}`;
  };

  const rankOf = (sid: string) => {
    const idx = data.findIndex((p) => p.studentId === sid);
    return idx === -1 ? null : idx + 1;
  };

  const topPerformer = data[0] ?? null;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score, 0) / data.length) : 0;

  const activeChildInList = data.find((p) => p.studentId === activeId);
  const activeChildOverall = overallData.find((p) => p.studentId === activeId);

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
      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-emerald-700" />
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
      <div className="py-3 lg:px-8 lg:py-6 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-r from-emerald-600 to-teal-500 rounded-3xl p-5 lg:p-6 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              {rankingCategory === "total" ? (
                <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
              ) : (
                <Trophy className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">
                {t("parentPages", "parentPortal", lang)}
              </p>
              <h1 className="text-xl font-bold">
                {rankingCategory === "total"
                  ? (lang === "ml" ? "ആകെ മികച്ച വിദ്യാർത്ഥി റാങ്കിംഗ്" : "Overall Best Student Ranking")
                  : (lang === "ml" ? "മികച്ച ഇബാദത്ത് പ്രകടനം" : "Best Ibadah Performance")}
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Category & Period Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setRankingCategory("total")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                rankingCategory === "total"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              <Star className={cn("w-4 h-4", rankingCategory === "total" ? "text-amber-500 fill-amber-500" : "text-gray-400")} />
              <span>{lang === "ml" ? "ആകെ സ്കോർ (Total)" : "Overall Best (Total)"}</span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block",
                rankingCategory === "total" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
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
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              <Trophy className={cn("w-4 h-4", rankingCategory === "ibadah" ? "text-emerald-600" : "text-gray-400")} />
              <span>{lang === "ml" ? "ഇബാദത്ത്" : "Ibadah Ranking"}</span>
            </button>
          </div>

          {/* Period Toggle */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1 shadow-xs w-fit">
            {(["week", "month"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setPeriodType(value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  periodType === value
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                {value === "week"
                  ? (lang === "ml" ? "ഈ ആഴ്ച (Weekly)" : "Weekly")
                  : (lang === "ml" ? "ഈ മാസം (Monthly)" : "Monthly")}
              </button>
            ))}
          </div>
        </div>

        {/* Period info */}
        {period && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl"
          >
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">
              {t("parentPages", "periodLabel", lang)}: {formatDateRange()}
            </span>
          </motion.div>
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
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-red-600 font-semibold">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ──────────────────────────────────────────────────────── */}
            {/* SECTION 1: Current Student Performance & Rank            */}
            {/* ──────────────────────────────────────────────────────── */}
            <div>
              <SectionHeader
                icon={Medal}
                title={activeStudent?.name ?? t("parentPages", "myChildPerformance", lang)}
              />

              {rankingCategory === "total" ? (
                /* Overall Performance for Child */
                !activeChildOverall ? (
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
                    className="bg-white rounded-3xl border border-emerald-200 p-5 lg:p-6 shadow-xs ring-1 ring-emerald-400/30 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 shrink-0">
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
                        <p className="text-2xl font-black text-emerald-600">
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
                        activeChildOverall.totalScore >= 80 ? "bg-emerald-100 text-emerald-700" : activeChildOverall.totalScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                      )}>
                        {activeChildOverall.totalPercentage}% · {activeChildOverall.totalScore >= 80 ? "Excellent" : activeChildOverall.totalScore >= 50 ? "Good" : "Needs Improvement"}
                      </span>
                    </div>

                    {/* Composite progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                      <div style={{ width: `${(activeChildOverall.attendance.score / 25) * 25}%` }} className="bg-emerald-500 h-full" title="Attendance" />
                      <div style={{ width: `${(activeChildOverall.homework.score / 25) * 25}%` }} className="bg-blue-500 h-full" title="Homework" />
                      <div style={{ width: `${(activeChildOverall.exam.score / 25) * 25}%` }} className="bg-purple-500 h-full" title="Exams" />
                      <div style={{ width: `${(activeChildOverall.ibadah.score / 25) * 25}%` }} className="bg-teal-500 h-full" title="Ibadah" />
                    </div>

                    {/* 4 Pillars Grid for Child */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3">
                        <div className="flex items-center justify-between font-bold text-emerald-800 text-xs mb-1">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-600" /> Attendance</span>
                          <span>{activeChildOverall.attendance.score}/25</span>
                        </div>
                        <p className="text-xs font-bold text-emerald-900">{activeChildOverall.attendance.rate}% rate</p>
                        <p className="text-[10px] text-emerald-600/90 mt-0.5">{activeChildOverall.attendance.presentDays}/{activeChildOverall.attendance.totalDays} days present</p>
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
                )
              ) : (
                /* Ibadah Performance for Child (Existing) */
                !activeChildInList ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                    <Medal className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-semibold text-sm">
                      {t("parentPages", "noIbadahForStudent", lang)}
                    </p>
                  </div>
                ) : (
                  (() => {
                    const child = activeChildInList;
                    const rank = rankOf(child.studentId);
                    const gap = topPerformer ? topPerformer.score - child.score : 0;
                    const vsAvg = child.score - avgScore;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm ring-1 ring-emerald-400/30 space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 shrink-0">
                            {child.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{child.name}</p>
                            <p className="text-xs text-gray-400">{child.adno}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                              {t("parentPages", "rankLabel", lang)}
                            </p>
                            <p className="text-2xl font-black text-emerald-600">
                              #{rank ?? "—"}
                              <span className="text-sm font-semibold text-gray-400 ml-1">/ {data.length}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                              {t("parentPages", "scoreLabel", lang)}
                            </p>
                            <p className="text-4xl font-black text-gray-900">
                              {child.score}<span className="text-lg font-semibold text-gray-400">%</span>
                            </p>
                          </div>
                          <span className={cn(
                            "text-[11px] font-bold px-3 py-1 rounded-full",
                            child.score >= 80 ? "bg-emerald-100 text-emerald-700" : child.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                          )}>
                            {child.score >= 80
                              ? t("parentPages", "excellentLabel", lang)
                              : child.score >= 50
                                ? t("parentPages", "goodLabel", lang)
                                : t("parentPages", "needsImprovement", lang)}
                          </span>
                        </div>

                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${child.score}%`,
                              background: child.score >= 80
                                ? "linear-gradient(to right, #10b981, #059669)"
                                : child.score >= 50
                                  ? "linear-gradient(to right, #f59e0b, #d97706)"
                                  : "linear-gradient(to right, #ef4444, #dc2626)",
                            }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl">
                            <Star className="w-3 h-3" />
                            {child.totalPrayers} {t("parentPages", "prayersLabel", lang)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-xl">
                            <BookOpen className="w-3 h-3" />
                            {child.totalQuranPages} {t("parentPages", "pagesLabel", lang)}
                          </span>
                          {Object.entries(child.customCounts ?? {}).map(([key, val]) => {
                            if (!val) return null;
                            const itemDef = customItems.find((i) => i.key === key);
                            const label = itemDef?.label ?? key;
                            return (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-xl"
                              >
                                <Sparkles className="w-3 h-3" />
                                {val} {label}
                              </span>
                            );
                          })}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-xl">
                            <Flame className="w-3 h-3" />
                            {child.streak}d {t("parentPages", "streakLabel", lang)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl">
                            {child.consistency}% {t("parentPages", "consistencyLabel", lang)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {topPerformer && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold">
                              <Trophy className="w-3 h-3" />
                              {t("parentPages", "topLabel", lang)}: {topPerformer.score}%
                            </div>
                          )}
                          <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold",
                            vsAvg >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                          )}>
                            {vsAvg >= 0 ? "▲" : "▼"} {t("parentPages", "avgLabel", lang)}: {avgScore}%
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-semibold">
                            {t("parentPages", "gapLabel", lang)}: {gap}%
                          </div>
                        </div>

                        {rank && rank <= 3 && (
                          <div className="flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                            <span className="text-2xl">{medalEmoji[rank - 1]}</span>
                            <span className="text-sm font-bold text-amber-800">
                              {rank === 1
                                ? t("parentPages", "firstRank", lang)
                                : rank === 2
                                  ? t("parentPages", "secondRank", lang)
                                  : t("parentPages", "thirdRank", lang)}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })()
                )
              )}
            </div>

            {/* ──────────────────────────────────────────────────────── */}
            {/* SECTION 2: Best Performer List                           */}
            {/* ──────────────────────────────────────────────────────── */}
            {/* Highlights Banner for Overall Best Student */}
            {rankingCategory === "total" && overallResponse?.highlights && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-2">
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
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 shadow-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                      <Star className="w-3.5 h-3.5" />
                      <span>{lang === "ml" ? "ഇബാദത്ത്" : "Best Ibadah"}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm truncate">{overallResponse.highlights.bestIbadah.name}</p>
                    <p className="text-[11px] text-gray-500">{overallResponse.highlights.bestIbadah.className} • {overallResponse.highlights.bestIbadah.percentage}%</p>
                  </div>
                )}
              </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* SECTION 2: Best Performer List                           */}
            {/* ──────────────────────────────────────────────────────── */}
            <div>
              <button
                onClick={() => setShowAllPerformers(!showAllPerformers)}
                className="w-full flex items-center justify-between mb-4 cursor-pointer"
              >
                <SectionHeader
                  icon={Trophy}
                  title={
                    rankingCategory === "total"
                      ? (periodType === "week" ? (lang === "ml" ? "ഈ ആഴ്ചയിലെ മികച്ച വിദ്യാർത്ഥികൾ" : "Weekly Best Students") : (lang === "ml" ? "ഈ മാസത്തെ മികച്ച വിദ്യാർത്ഥികൾ" : "Monthly Best Students"))
                      : t("parentPages", "bestPerformers", lang)
                  }
                  count={rankingCategory === "total" ? overallData.length : data.length}
                />
                {showAllPerformers
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {rankingCategory === "total" ? (
                overallData.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
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
                            "bg-white rounded-2xl border p-4 shadow-sm transition-all",
                            isMyChild ? "ring-2 ring-emerald-400 bg-emerald-50/50 border-emerald-200" : "border-gray-100",
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
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
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
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                                  <Star className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Ibadah: {performer.ibadah.percentage}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-emerald-600">
                                {performer.totalScore}
                              </p>
                              <p className="text-[11px] font-semibold text-gray-400">
                                / 100 PTS
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 rounded-full transition-all duration-700"
                              style={{ width: `${performer.totalPercentage}%` }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              ) : (
                data.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-semibold">
                      {t("parentPages", "noIbadahData", lang)}
                    </p>
                  </div>
                ) : showAllPerformers && (
                  <div className="space-y-3">
                    {data.map((performer, i) => {
                      const rank = rankOf(performer.studentId) ?? i + 1;
                      const isMyChild = ids.includes(performer.studentId);
                      return (
                        <motion.div
                          key={performer.studentId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "bg-white rounded-2xl border p-4 shadow-sm transition-all",
                            isMyChild ? "ring-2 ring-emerald-400 bg-emerald-50/50 border-emerald-200" : "border-gray-100",
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
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                                    {t("parentPages", "myChildBestPerf", lang)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{performer.adno}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                                  <Star className="w-3 h-3" />
                                  {performer.totalPrayers} {t("parentPages", "prayersLabel", lang)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                                  <BookOpen className="w-3 h-3" />
                                  {performer.totalQuranPages} {t("parentPages", "pagesLabel", lang)}
                                </span>
                                {Object.entries(performer.customCounts ?? {}).map(([key, val]) => {
                                  if (!val) return null;
                                  const itemDef = customItems.find((i) => i.key === key);
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
                              <p className="text-2xl font-black text-emerald-600">
                                {performer.score}
                              </p>
                              <p className="text-[11px] font-semibold text-gray-400">
                                {t("parentPages", "scoreUppercase", lang)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700"
                              style={{ width: `${performer.score}%` }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
