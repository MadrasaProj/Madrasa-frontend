import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeaderSwitchers } from "@/components/ui/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BestPerformerCard } from "@/components/parent/BestPerformerCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { useRefreshParentStudents } from "@/lib/hooks/useRefreshParentStudents";
import {
  useBestPerformers,
  useUnreadCount,
  useStudentAttendance,
  useStudentHomework,
  useStudentIbadah,
} from "@/lib/queries";
import { periodDates } from "@/lib/best-performance-period";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import {
  Bell,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock3,
  GraduationCap,
  IndianRupee,
  Loader2,
  MoonStar,
  NotebookPen,
  TrendingUp,
  User,
} from "lucide-react";

export default function ParentDashboard() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  useRefreshParentStudents();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const accessibleStudentIds = user?.accessibleStudentIds ?? [];
  const accessibleStudents = user?.accessibleStudents ?? [];
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
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Avatar className="size-10 shrink-0 ring-2 ring-primary-100 sm:size-11">
              <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-primary-50 text-sm font-semibold text-primary-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 my-auto h-10">
              <h1 className="truncate text-lg font-bold tracking-tight text-gray-950 sm:text-xl">
                {user?.name ?? t("common", "parent", lang)}{" "}
                <span aria-hidden="true">👋</span>
              </h1>
              <span className="relative -top-2 inline-flex rounded-full text-[11px] font-semibold text-primary-700">
                {t("common", "parent", lang)}
              </span>
            </div>
          </div>
          <PageHeaderSwitchers />
        </header>

        {/* Ibadah report and best performers */}
        <section
          aria-labelledby="parent-ibadah-heading"
          className="overflow-hidden rounded-2xl p-4 mt-10 shadow-xs sm:p-5"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.6)), url('/imgs/teacher/dashboard-corner-primary.png')",
            backgroundPosition: "center, right bottom",
            backgroundSize: "cover, min(80%, 30rem) auto",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="text-center">
            <h2 id="parent-ibadah-heading" className="text-base font-bold text-gray-900 sm:text-lg">
              {t("parentPages", "ibadahTitle", lang)}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{t("parentPages", "bestIbadahPerf", lang)}</p>
          </div>
          {activeId ? (
            loadingPerformance ? (
              <Skeleton className="mx-auto mt-6 h-72 max-w-md rounded-[26px]" />
            ) : performanceError ? (
              <p className="mt-6 text-center text-sm text-red-600">{performanceError.message}</p>
            ) : performers.length === 0 ? (
              <p className="mt-6 text-center text-sm text-gray-500">{t("parentPages", "noIbadahData", lang)}</p>
            ) : (
              <Swiper
                key={`${performance?.period.from}-${performance?.period.to}-${activeId}`}
                modules={[Pagination]}
                slidesPerView={1}
                spaceBetween={16}
                grabCursor
                pagination={{ clickable: true, dynamicBullets: true }}
                className="mx-auto mt-5 w-full max-w-lg [&_.swiper-pagination-bullet]:!size-2.5 [&_.swiper-pagination-bullet-active]:!bg-primary"
                aria-label={t("parentPages", "bestPerformers", lang)}
              >
                {performers.map((performer, index) => (
                  <SwiperSlide key={performer.studentId} className="!h-auto">
                    <BestPerformerCard
                      performer={performer}
                      rank={index + 1}
                      isMyChild={accessibleStudentIds.includes(performer.studentId)}
                      customItems={performance?.customItems ?? []}
                      lang={lang}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            )
          ) : (
            <p className="mt-6 text-center text-sm text-gray-500">{t("parentPages", "noChildren", lang)}</p>
          )}
          <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100 pt-4 text-center">
            <div className="px-1">
              <p className="text-xl font-bold tabular-nums text-gray-950 sm:text-2xl">{loadingIbadah ? "—" : completedPrayers}</p>
              <p className="text-[11px] text-gray-500">{t("parentPages", "fiveDailyPrayers", lang)}</p>
            </div>
            <div className="px-1">
              <p className="text-xl font-bold tabular-nums text-primary-700 sm:text-2xl">{loadingIbadah ? "—" : `${ibadahPercent}%`}</p>
              <p className="text-[11px] text-gray-500">{t("teacherPages", "completion", lang)}</p>
            </div>
            <div className="px-1">
              <p className="text-xl font-bold tabular-nums text-amber-700 sm:text-2xl">{loadingIbadah ? "—" : remainingPrayers}</p>
              <p className="text-[11px] text-gray-500">{t("parentPages", "pendingAction", lang)}</p>
            </div>
          </div>
        </section>

        {/* Attendance Card */}
        <button
          type="button"
          onClick={() => navigate("/parent/attendance")}
          aria-labelledby="parent-attendance-heading"
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-white bg-linear-120 from-white via-primary-50 to-white p-3 text-left shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
        >
          <img src="/imgs/attendance/attendance-checklist.png" alt="" className="size-14 shrink-0 object-contain sm:size-16" loading="lazy" />
          <div className="min-w-0 flex-1">
            <h2 id="parent-attendance-heading" className="text-sm font-bold text-gray-950 sm:text-base">
              {t("parentPages", "attendanceTitle", lang)}
            </h2>
            {loadingAttendance ? (
              <p className="mt-0.5 text-xs text-gray-600">{t("common", "loading", lang)}</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium sm:text-xs">
                <span className="inline-flex items-center gap-1 text-primary-800"><span className="size-1.5 rounded-full bg-primary" />{attPresent} {t("common", "present", lang)}</span>
                <span className="inline-flex items-center gap-1 text-red-700"><span className="size-1.5 rounded-full bg-red-300" />{attAbsent} {t("common", "absent", lang)}</span>
                <span className="text-gray-500">{attTotal} {t("parentPages", "presentDays", lang)}</span>
              </div>
            )}
          </div>
          {loadingAttendance ? <Loader2 className="size-5 shrink-0 animate-spin text-primary-700" /> : (
            <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#059669 ${attendancePercent}%, #e5e7eb 0)` }} role="img" aria-label={`${attendancePercent}% ${t("teacherPages", "attendanceRateLabel", lang)}`}>
              <span className="flex size-12 items-center justify-center rounded-full bg-white text-xs font-bold tabular-nums text-gray-950">{attendancePercent}%</span>
            </div>
          )}
        </button>

        {/* Homework Card */}
        <section aria-labelledby="parent-homework-heading" className="relative overflow-hidden rounded-2xl border-2 border-white bg-linear-to-br from-primary-50 to-white p-4 shadow-xs sm:p-5">
          <img src="/icons/homework/completed-notebook.webp" alt="" className="pointer-events-none absolute -right-2 -bottom-12 size-50 -rotate-6 object-contain drop-shadow-[0_14px_12px_rgba(47,91,22,0.22)] sm:-right-4 sm:-top-9 sm:size-52" loading="lazy" />
          <h2 id="parent-homework-heading" className="text-base font-bold text-gray-900 sm:text-lg">
            {t("parentPages", "homeworkTitle", lang)}
          </h2>
          <div className="relative w-[55%] min-w-0">
            {loadingHomework ? (
              <div className="mt-2 flex min-h-20 items-center gap-2 text-sm text-gray-600"><Loader2 className="size-4 animate-spin" />{t("common", "loading", lang)}</div>
            ) : hwTotal === 0 ? (
              <p className="mt-2 text-sm text-gray-600">{t("teacherPages", "noAssignmentsYet", lang)}</p>
            ) : (
              <div className="mt-2 divide-y divide-primary-100">
                <p className="py-1 text-base font-semibold tabular-nums text-gray-950 sm:text-xl">{hwTotal} <span className="ml-1 text-sm font-medium text-gray-500">{t("parentPages", "homeworkTitle", lang)}</span></p>
                <p className="py-1 text-base font-semibold tabular-nums text-gray-950 sm:text-xl">{homeworkPercent}% <span className="ml-1 text-sm font-medium text-gray-500">{t("teacherPages", "submittedStatus", lang)}</span></p>
                <p className="py-1 text-xs font-medium text-amber-700">{hwPending} {t("common", "pending", lang)}</p>
              </div>
            )}
            <Button size="sm" onClick={() => navigate("/parent/homework")} className="mt-4 h-9 rounded-full px-4">
              {t("parentPages", "hwList", lang)} <ChevronRight className="size-4" />
            </Button>
          </div>
        </section>

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
