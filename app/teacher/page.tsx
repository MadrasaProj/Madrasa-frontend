import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getClassIbadah } from "@/lib/ibadah-api";
import { getClassAttendance } from "@/lib/attendance-api";
import { getSubmissions, listHomework } from "@/lib/homework-api";
import { useStudentsList } from "@/lib/queries";
import {
  Bell,
  BookOpen,
  CalendarCheck2,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock3,
  GraduationCap,
  IndianRupee,
  Loader2,
  MoonStar,
  NotebookPen,
  TrendingUp,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

const TeacherIbadahPage = lazy(() => import("@/app/teacher/ibadah/page"));

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

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const [ibadahDrawerOpen, setIbadahDrawerOpen] = useState(false);
  const { activeClass, activeClassId, isLoading: loadingClass } = useActiveClass();
  const clientId = user?.clientId ?? "";
  const token = accessToken ?? "";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const date = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  const dateLabel = yesterday.toLocaleDateString(
    lang === "ml" ? "ml-IN" : "en-IN",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  const students = useStudentsList(
    { clientId, token },
    { classId: activeClassId, limit: 1 },
    { enabled: !!clientId && !!token && !!activeClassId },
  );

  const ibadah = useQuery({
    queryKey: ["ibadah", "class", clientId, activeClassId, date],
    queryFn: () =>
      getClassIbadah(clientId, token, { classId: activeClassId, date }),
    enabled: !!clientId && !!token && !!activeClassId,
  });

  const attendance = useQuery({
    queryKey: [
      "attendance",
      "class",
      clientId,
      activeClassId,
      todayDate,
      user?.defaultAcademicYearId,
    ],
    queryFn: () =>
      getClassAttendance(clientId, token, {
        classId: activeClassId,
        date: todayDate,
        ...(user?.defaultAcademicYearId
          ? { academicYearId: user.defaultAcademicYearId }
          : {}),
        take: 500,
      }),
    enabled: !!clientId && !!token && !!activeClassId,
  });

  const homework = useQuery({
    queryKey: ["homework", "class-stats", clientId, activeClassId],
    queryFn: async () => {
      const assignments = (
        await listHomework(clientId, token, {
          classId: activeClassId,
        })
      ).filter((assignment) => assignment.classId === activeClassId);
      const submissions = await Promise.all(
        assignments.map((assignment) =>
          getSubmissions(clientId, token, assignment.id),
        ),
      );
      const completedByStudent = new Map<string, number>();
      let submittedCount = 0;
      for (const result of submissions) {
        for (const submission of result.submissions) {
          if (
            submission.status === "SUBMITTED" ||
            submission.status === "CHECKED"
          ) {
            submittedCount += 1;
          }
          if (submission.student?.id && submission.status !== "NOT_SUBMITTED") {
            completedByStudent.set(
              submission.student.id,
              (completedByStudent.get(submission.student.id) ?? 0) + 1,
            );
          }
        }
      }
      return {
        assignments: assignments.length,
        submittedCount,
        completedStudents: [...completedByStudent.values()].filter(
          (count) => count === assignments.length,
        ).length,
      };
    },
    enabled: !!clientId && !!token && !!activeClassId,
    refetchOnMount: "always",
  });

  const total = students.data?.total ?? 0;

  // Attendance metrics
  const attendanceRecords = attendance.data?.records ?? [];
  const presentCount = attendanceRecords.filter(
    (record) => record.status === "PRESENT",
  ).length;
  const absentCount = attendanceRecords.filter(
    (record) => record.status === "ABSENT",
  ).length;
  const markedCount = attendance.data?.total ?? 0;
  const attendancePercent =
    total > 0 ? Math.min(100, Math.round((presentCount / total) * 100)) : 0;
  const attendanceTaken = markedCount > 0;
  const loadingAttendance =
    loadingClass ||
    (!!activeClassId && (students.isLoading || attendance.isLoading));

  // Ibadah metrics
  const completed = Math.min(
    total,
    new Set(ibadah.data?.logs.map((log) => log.studentId) ?? []).size,
  );
  const remaining = Math.max(0, total - completed);
  const ibadahPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const loadingIbadah =
    loadingClass ||
    (!!activeClassId && (students.isLoading || ibadah.isLoading));

  // Homework metrics
  const homeworkCompleted = Math.min(
    total,
    homework.data?.completedStudents ?? 0,
  );
  const expectedSubmissions = total * (homework.data?.assignments ?? 0);
  const homeworkPercent =
    expectedSubmissions > 0
      ? Math.min(
          100,
          Math.round(
            ((homework.data?.submittedCount ?? 0) / expectedSubmissions) * 100,
          ),
        )
      : 0;
  const loadingHomework =
    loadingClass ||
    (!!activeClassId && (students.isLoading || homework.isLoading));

  const initials = (user?.name?.trim() || "Teacher")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const actions = [
    {
      title: t("common", "present", lang),
      href: "/teacher/present",
      icon: UserCheck,
    },
    {
      title: t("common", "absent", lang),
      href: "/teacher/absent",
      icon: UserX,
    },
    {
      title: t("nav", "homework", lang),
      href: "/teacher/homework",
      icon: BookOpen,
    },
    {
      title: t("teacherPages", "hwOverviewAction", lang),
      href: "/teacher/homework-list",
      icon: ClipboardList,
    },
    {
      title: t("nav", "ibadah", lang),
      href: "/teacher/ibadah",
      icon: MoonStar,
    },
    {
      title: t("nav", "exams", lang),
      href: "/teacher/exams",
      icon: GraduationCap,
    },
    {
      title: t("nav", "performance", lang),
      href: "/teacher/performance",
      icon: TrendingUp,
    },
    {
      title: t("nav", "diary", lang),
      href: "/teacher/diary",
      icon: NotebookPen,
    },
    {
      title: t("nav", "fees", lang),
      href: "/teacher/fees",
      icon: IndianRupee,
    },
    {
      title: t("nav", "notifications", lang),
      href: "/teacher/notifications",
      icon: Bell,
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
                  {user?.name ?? t("common", "teacher", lang)}{" "}
                  <span aria-hidden="true">👋</span>
                </h1>
                <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                  {t("common", "teacher", lang)}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {activeClass && (
                  <span className="rounded-full bg-white px-2 py-0.5 font-medium text-gray-700 ring-1 ring-gray-200">
                    {t("common", "class", lang)}: {activeClass.name}
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
        </header>

        {/* Attendance Card */}
        <section
          aria-labelledby="attendance-card-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-sky-50/70 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="attendance-card-heading"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {t("teacherPages", "attendanceTitle", lang)}
              </h2>
              {activeClass && (
                <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                  {activeClass.name}
                </span>
              )}
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0",
                attendanceTaken
                  ? "border border-primary-100 bg-primary-50 text-primary-700"
                  : "border border-amber-100 bg-amber-50 text-amber-700",
              )}
            >
              {attendanceTaken
                ? t("teacherPages", "markedStudents", lang)
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
                ) : attendanceTaken ? (
                  <>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-gray-950">
                      {presentCount}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        / {total} {t("common", "present", lang)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CircleCheck className="size-3" /> {presentCount}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <CircleX className="size-3" /> {absentCount} {t("common", "absent", lang)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                      {t("teacherPages", "takeAttendanceInstruction", lang)}
                    </div>
                    <p className="mt-0.5 text-xs text-amber-700 font-medium">
                      {total} {t("teacherPages", "totalStudents", lang).toLowerCase()}
                    </p>
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
              onClick={() => navigate("/teacher/attendance")}
              size="lg"
              variant={attendanceTaken ? "outline" : "default"}
              className="gap-1.5 "
            >
              <UserCheck className="size-3.5" />
              {attendanceTaken
                ? t("teacherPages", "reviewAttendance", lang)
                : t("teacherPages", "markAttendanceDesc", lang)}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </section>

        {/* Ibadah Card */}
        <section
          aria-labelledby="ibadah-card-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="ibadah-card-heading"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {t("teacherPages", "ibadahTitle", lang)}
              </h2>
              <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                {dateLabel}
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
                      {completed}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        / {total} {t("teacherPages", "completedStudents", lang)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="text-amber-700 font-medium">{remaining}</span>{" "}
                      {t("teacherPages", "pendingIbadahStudents", lang).toLowerCase()}
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
              {t("teacherPages", "previousDayIbadah", lang)}
            </span>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIbadahDrawerOpen(true)}
              disabled={!activeClassId}
              className="gap-1.5  "
            >
              <MoonStar className="size-3.5" />
              {t("teacherPages", "ibadahRecordsTitle", lang)}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </section>

        {/* Homework Card */}
        <section
          aria-labelledby="homework-card-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-amber-50/30 p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="homework-card-heading"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {t("teacherPages", "classHomework", lang)}
              </h2>
              {activeClass && (
                <span className="hidden sm:inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                  {activeClass.name}
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
                ) : (homework.data?.assignments ?? 0) === 0 ? (
                  <div className="text-sm font-medium text-gray-600">
                    {t("teacherPages", "noAssignmentsYet", lang)}
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-gray-950">
                      {homework.data?.assignments ?? 0}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        {t("teacherPages", "homeworkTitle", lang)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="font-medium text-gray-900">{homeworkCompleted}</span>{" "}
                      / {total} {t("teacherPages", "completedStudents", lang).toLowerCase()}
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
              {homework.data?.submittedCount ?? 0} {t("teacherPages", "studentSubmissions", lang).toLowerCase()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/teacher/homework")}
                className="gap-1  "
              >
                <BookOpen className="size-3.5" />
                {t("teacherPages", "assignHomework", lang)}
              </Button>
              <Button
                size="lg"
                onClick={() => navigate("/teacher/homework-list")}
                className="gap-1   "
              >
                <ClipboardList className="size-3.5" />
                {t("teacherPages", "hwListTitle", lang)}
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section
          aria-labelledby="teacher-actions-heading"
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <h2
              id="teacher-actions-heading"
              className="text-sm sm:text-base font-bold text-gray-950"
            >
              {t("teacherPages", "quickActions", lang)}
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              {actions.length}
            </span>
          </div>

          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {actions.map((action) => (
              <li key={action.href} className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-center transition-colors hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-100">
                    <action.icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold leading-snug text-gray-800 group-hover:text-primary-700">
                    {action.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Ibadah Details Drawer */}
        <Drawer
          open={ibadahDrawerOpen}
          onOpenChange={setIbadahDrawerOpen}
          swipeDirection="down"
        >
          <DrawerContent className="max-h-[90dvh] bg-white p-0">
            <DrawerHeader className="flex flex-row items-center justify-between border-b border-gray-100 px-5 py-4 text-left">
              <div>
                <DrawerTitle className="text-base sm:text-lg font-bold text-gray-900">
                  {t("teacherPages", "ibadahRecordsTitle", lang)}
                </DrawerTitle>
                <p className="mt-0.5 text-xs text-gray-500">
                  {activeClass ? `${activeClass.name} · ` : ""}
                  {dateLabel}
                </p>
              </div>
              <DrawerClose
                aria-label={t("common", "close", lang)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 active:scale-95"
              >
                <X className="size-4" />
              </DrawerClose>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-3">
              {ibadahDrawerOpen && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-16 text-gray-400">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                  }
                >
                  <TeacherIbadahPage initialDate={date} embedded />
                </Suspense>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </DashboardLayout>
  );
}


