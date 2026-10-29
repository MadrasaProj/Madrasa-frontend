import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeaderSwitchers } from "@/components/ui/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useRefreshParentStudents } from "@/lib/hooks/useRefreshParentStudents";
import {
  useBestPerformers,
  useUnreadCount,
  useStudentAttendance,
  useStudentHomework,
  useStudentIbadah,
} from "@/lib/queries";
import { periodDates } from "@/lib/best-performance-period";
import {
  Award,
  Bell,
  BookOpen,
  CalendarCheck2,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock3,
  Flame,
  GraduationCap,
  IndianRupee,
  Loader2,
  MoonStar,
  NotebookPen,
  TrendingUp,
  User,
} from "lucide-react";

function CompactGauge({
  value,
  color = "#059669",
  label = "Rate",
}: {
  value: number;
  color?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const angle = Math.PI * (1 - clamped / 100);
  const x = Number((50 + 36 * Math.cos(angle)).toFixed(2));
  const y = Number((45 - 36 * Math.sin(angle)).toFixed(2));

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <svg
        viewBox="0 0 100 54"
        className="h-11 w-20 sm:h-12 sm:w-22 overflow-visible"
        role="img"
        aria-label={`${label}: ${clamped}%`}
      >
        <path
          d="M 14 45 A 36 36 0 0 1 86 45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {clamped > 0 && (
          <path
            d={`M 14 45 A 36 36 0 0 1 ${x} ${y}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
        <text
          x="50"
          y="42"
          textAnchor="middle"
          className="fill-gray-950 text-[13px] font-bold"
        >
          {clamped}%
        </text>
      </svg>
      {label && (
        <span className="text-[10px] font-medium text-gray-500 mt-0.5">
          {label}
        </span>
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  useRefreshParentStudents();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const accessibleStudentIds = user?.accessibleStudentIds ?? [];
  const accessibleStudents = user?.accessibleStudents ?? [];
  const childCount = accessibleStudentIds.length;
  const activeId = activeStudentId ?? accessibleStudentIds[0] ?? "";
  const activeStudent = accessibleStudents.find((student) => student.id === activeId);

  // Unread notifications
  const { data: unreadData } = useUnreadCount({ clientId: cid, token });
  const unread = unreadData?.count ?? 0;

  // Best performance query
  const {
    data: performance,
    isLoading: loadingPerformance,
    error: performanceError,
  } = useBestPerformers(
    { clientId: cid, token },
    {
      ...periodDates("month"),
      limit: 100,
      ...(activeStudent?.classId && { classId: activeStudent.classId }),
      ...(activeStudent?.gender && { gender: activeStudent.gender }),
    },
    { enabled: !!cid && !!token && !!activeId },
  );
  const performers = performance?.performers ?? [];
  const activePerformer = performers.find((performer) => performer.studentId === activeId);
  const activeRank = activePerformer
    ? performers.findIndex((performer) => performer.studentId === activeId) + 1
    : 0;

  // Student Attendance query
  const { data: attendance, isLoading: loadingAttendance } = useStudentAttendance(
    { clientId: cid, token },
    activeId,
    user?.defaultAcademicYearId
      ? { academicYearId: user.defaultAcademicYearId, take: 365 }
      : { take: 365 },
    { enabled: !!cid && !!token && !!activeId },
  );
  const attTotal = attendance?.total ?? 0;
  const attPresent = attendance?.summary?.PRESENT ?? 0;
  const attAbsent = attendance?.summary?.ABSENT ?? 0;
  const attendancePercent =
    attTotal > 0 ? Math.min(100, Math.round((attPresent / attTotal) * 100)) : 0;

  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayRecord = attendance?.records?.find((r) => r.date.startsWith(todayDateStr));
  const todayStatus = todayRecord?.status;

  // Student Ibadah query
  const { data: ibadah, isLoading: loadingIbadah } = useStudentIbadah(
    { clientId: cid, token },
    activeId,
    { limit: 14 },
    { enabled: !!cid && !!token && !!activeId },
  );
  const prayerKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const todayLog = ibadah?.logs?.find((l) => l.date.split("T")[0] === todayDateStr);
  const completedPrayers = todayLog
    ? prayerKeys.filter((p) => todayLog[p] !== null && todayLog[p] !== undefined).length
    : 0;
  const remainingPrayers = Math.max(0, 5 - completedPrayers);
  const ibadahPercent = Math.min(100, Math.round((completedPrayers / 5) * 100));
  const ibadahCompleted = completedPrayers === 5;

  // Student Homework query
  const { data: homework, isLoading: loadingHomework } = useStudentHomework(
    { clientId: cid, token },
    activeId,
    { enabled: !!cid && !!token && !!activeId },
  );
  const hwItems = homework?.homework ?? [];
  const hwTotal = hwItems.length;
  const hwSubmitted = hwItems.filter(
    (item) => item.submission?.status === "SUBMITTED" || item.submission?.status === "CHECKED",
  ).length;
  const hwPending = hwItems.filter(
    (item) => item.submission?.status === "NOT_SUBMITTED" || !item.submission,
  ).length;
  const homeworkPercent =
    hwTotal > 0 ? Math.min(100, Math.round((hwSubmitted / hwTotal) * 100)) : 0;

  const initials = (user?.name?.trim() || "Parent")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const actions = [
    {
      title: t("parentPages", "studentProfile", lang),
      icon: User,
      href: "/parent/students",
    },
    {
      title: t("parentPages", "attendanceTitle", lang),
      icon: ClipboardList,
      href: "/parent/attendance",
    },
    {
      title: t("parentPages", "homeworkTitle", lang),
      icon: BookOpen,
      href: "/parent/homework",
      badge: hwPending > 0 ? hwPending : undefined,
    },
    {
      title: t("parentPages", "ibadahTitle", lang),
      icon: MoonStar,
      href: "/parent/ibadah",
    },
    {
      title: t("parentPages", "feesTitle", lang),
      icon: IndianRupee,
      href: "/parent/fees",
    },
    {
      title: t("parentPages", "resultsTitle", lang),
      icon: GraduationCap,
      href: "/parent/results",
    },
    {
      title: t("nav", "diary", lang),
      icon: NotebookPen,
      href: "/parent/diary",
    },
    {
      title: t("nav", "leaveRequests", lang),
      icon: Clock3,
      href: "/parent/leave-requests",
    },
    {
      title: t("nav", "performance", lang),
      icon: TrendingUp,
      href: "/parent/best-performance",
    },
    {
      title: t("parentPages", "notifTitle", lang),
      icon: Bell,
      href: "/parent/notifications",
      badge: unread > 0 ? unread : undefined,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-5">
        {/* Welcome Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-13 shrink-0 ring-2 ring-primary-100 sm:size-14">
              <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-primary-50 text-base font-semibold text-primary-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-lg font-bold tracking-tight text-gray-950 sm:text-xl">
                  {user?.name ?? t("common", "parent", lang)}{" "}
                  <span aria-hidden="true">👋</span>
                </h1>
                <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                  {t("common", "parent", lang)}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {activeStudent && (
                  <span className="rounded-full bg-white px-2 py-0.5 font-medium text-gray-700 ring-1 ring-gray-200">
                    {activeStudent.name}
                    {activeStudent.className ? ` · ${activeStudent.className}` : ""}
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium text-gray-500">
                  <CalendarCheck2 className="size-3.5" />
                  {today.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          </div>
          <PageHeaderSwitchers />
        </header>

        {/* Attendance Card */}
        <section
          aria-labelledby="parent-attendance-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-sky-50/70 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="parent-attendance-heading"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {t("parentPages", "attendanceTitle", lang)}
              </h2>
              {activeStudent?.className && (
                <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                  {activeStudent.className}
                </span>
              )}
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0",
                todayStatus === "PRESENT"
                  ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                  : todayStatus === "ABSENT"
                  ? "border border-red-100 bg-red-50 text-red-700"
                  : todayStatus
                  ? "border border-blue-100 bg-blue-50 text-blue-700"
                  : "border border-amber-100 bg-amber-50 text-amber-700",
              )}
            >
              {todayStatus === "PRESENT"
                ? t("common", "present", lang)
                : todayStatus === "ABSENT"
                ? t("common", "absent", lang)
                : todayStatus
                ? todayStatus
                : t("common", "pending", lang)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img
                src="/imgs/attendance/attendance-checklist.png"
                alt=""
                className="size-15 sm:size-18 shrink-0 object-contain drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0">
                {loadingAttendance ? (
                  <div className="flex items-center gap-2 text-gray-400 py-1">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-xs">{t("common", "loading", lang)}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-gray-950">
                      {attPresent}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        / {attTotal} {t("parentPages", "presentDays", lang)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CircleCheck className="size-3" /> {attPresent} {t("common", "present", lang).toLowerCase()}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <CircleX className="size-3" /> {attAbsent} {t("common", "absent", lang).toLowerCase()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <CompactGauge
              value={attendancePercent}
              color="#059669"
              label={t("teacherPages", "attendanceRateLabel", lang)}
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">
              {today.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <Button
              onClick={() => navigate("/parent/attendance")}
              size="lg"
              variant="outline"
              className="gap-1.5"
            >
              <ClipboardList className="size-3.5" />
              {t("common", "view", lang)} {t("nav", "attendance", lang)}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </section>

        {/* Ibadah Card */}
        <section
          aria-labelledby="parent-ibadah-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="parent-ibadah-heading"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {t("parentPages", "ibadahTitle", lang)}
              </h2>
              <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                {today.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 shrink-0">
              {ibadahPercent}% {t("teacherPages", "completion", lang)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img
                src="/icons/ibadah/weekly-report.webp"
                alt=""
                className="size-15 sm:size-18 shrink-0 object-contain drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0">
                {loadingIbadah ? (
                  <div className="flex items-center gap-2 text-gray-400 py-1">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-xs">{t("common", "loading", lang)}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-gray-950">
                      {completedPrayers}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        / 5 {t("parentPages", "fiveDailyPrayers", lang)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {ibadahCompleted ? (
                        <span className="text-emerald-700 font-medium">
                          {t("parentPages", "allFard", lang)}
                        </span>
                      ) : (
                        <>
                          <span className="text-amber-700 font-medium">{remainingPrayers}</span>{" "}
                          {t("parentPages", "pendingAction", lang).toLowerCase()}
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>

            <CompactGauge
              value={ibadahPercent}
              color="#059669"
              label={t("teacherPages", "completion", lang)}
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">
              {t("parentPages", "todayChecklist", lang)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/parent/ibadah")}
                className="gap-1.5"
              >
                <MoonStar className="size-3.5" />
                {t("parentPages", "record", lang)}
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Homework Card */}
        <section
          aria-labelledby="parent-homework-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-amber-50/30 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="parent-homework-heading"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {t("parentPages", "homeworkTitle", lang)}
              </h2>
              {activeStudent && (
                <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                  {activeStudent.name}
                </span>
              )}
            </div>
            <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 shrink-0">
              {homeworkPercent}% {t("teacherPages", "submittedStatus", lang)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img
                src="/imgs/homework/1.webp"
                alt=""
                className="size-15 sm:size-18 shrink-0 object-contain drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0">
                {loadingHomework ? (
                  <div className="flex items-center gap-2 text-gray-400 py-1">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-xs">{t("common", "loading", lang)}</span>
                  </div>
                ) : hwTotal === 0 ? (
                  <div className="text-sm font-medium text-gray-600">
                    {t("teacherPages", "noAssignmentsYet", lang)}
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-gray-950">
                      {hwTotal}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        {t("parentPages", "homeworkTitle", lang)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="font-medium text-gray-900">{hwSubmitted}</span>{" "}
                      / {hwTotal} {t("teacherPages", "submittedStatus", lang).toLowerCase()}
                      {hwPending > 0 && (
                        <span className="ml-1.5 text-amber-700 font-medium">
                          ({hwPending} {t("common", "pending", lang).toLowerCase()})
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>

            <CompactGauge
              value={homeworkPercent}
              color="#059669"
              label={t("teacherPages", "completion", lang)}
            />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">
              {hwSubmitted} / {hwTotal} {t("teacherPages", "submittedStatus", lang).toLowerCase()}
            </span>
            <Button
              size="lg"
              onClick={() => navigate("/parent/homework")}
              className="gap-1"
            >
              <BookOpen className="size-3.5" />
              {t("parentPages", "hwList", lang)}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </section>

        {/* Ibadah Performance Section */}
        {activeId && (
          <section
            aria-labelledby="parent-best-performance-heading"
            className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-purple-50/40 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2
                  id="parent-best-performance-heading"
                  className="text-sm sm:text-base font-bold text-gray-900 truncate"
                >
                  {t("parentPages", "bestIbadahPerf", lang)}
                </h2>
                {activeStudent && (
                  <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                    {activeStudent.name}
                  </span>
                )}
              </div>
              <span className="rounded-full border border-purple-100 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 shrink-0">
                {activeRank > 0
                  ? `${t("parentPages", "rankLabel", lang)} #${activeRank}`
                  : activePerformer
                  ? `${activePerformer.score} ${t("parentPages", "scoreLabel", lang)}`
                  : t("common", "overview", lang)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <img
                  src="/icons/best-performance/streak-v2.webp"
                  alt=""
                  className="size-15 sm:size-18 shrink-0 object-contain drop-shadow-xs"
                  loading="lazy"
                />
                <div className="min-w-0">
                  {loadingPerformance ? (
                    <div className="flex items-center gap-2 text-gray-400 py-1">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-xs">{t("common", "loading", lang)}</span>
                    </div>
                  ) : performanceError ? (
                    <p className="text-xs text-red-600">{performanceError.message}</p>
                  ) : activePerformer ? (
                    <>
                      <div className="text-xl sm:text-2xl font-bold tabular-nums text-gray-950">
                        {activePerformer.score}{" "}
                        <span className="text-xs font-semibold text-gray-500">
                          {t("parentPages", "scoreLabel", lang)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                        {activeRank > 0 && (
                          <>
                            <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                              <Award className="size-3" /> {t("parentPages", "rankLabel", lang)} #{activeRank}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                          <Flame className="size-3 text-amber-500" /> {activePerformer.streak}d {t("parentPages", "streakLabel", lang).toLowerCase()}
                        </span>
                        <span>·</span>
                        <span className="text-gray-500">
                          {activePerformer.totalPrayers} {t("parentPages", "prayersLabel", lang).toLowerCase()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                        {t("parentPages", "noIbadahData", lang)}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t("parentPages", "myChildPerformance", lang)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <CompactGauge
                value={activePerformer?.consistency ?? 0}
                color="#7c3aed"
                label={t("parentPages", "consistencyLabel", lang)}
              />
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500 capitalize">
                {new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/parent/best-performance")}
                className="gap-1.5"
              >
                <TrendingUp className="size-3.5" />
                {t("common", "view", lang)} {t("parentPages", "bestIbadahPerf", lang)}
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </section>
        )}

        {/* Quick Actions Grid */}
        <section
          aria-labelledby="parent-actions-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <h2
              id="parent-actions-heading"
              className="text-sm sm:text-base font-bold text-gray-950"
            >
              {t("parentPages", "quickAccess", lang)}
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              {actions.length}
            </span>
          </div>

          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {actions.map((action) => (
              <li key={action.href} className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-center transition-colors hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-100">
                    <action.icon aria-hidden="true" className="size-5" />
                    {action.badge !== undefined && action.badge > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs">
                        {action.badge}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold leading-snug text-gray-800 group-hover:text-primary-700">
                    {action.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
