import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  MoonStar,
  NotebookPen,
  TrendingUp,
  UserCheck,
  UserX,
  UsersRound,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { getClassIbadah } from "@/lib/ibadah-api";
import { getClassAttendance } from "@/lib/attendance-api";
import { getSubmissions, listHomework } from "@/lib/homework-api";
import { useAttendanceSummary, useStudentsList } from "@/lib/queries";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { useActiveClass } from "@/store/activeClass";
import { lazy, Suspense, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TeacherIbadahPage = lazy(() => import("@/app/teacher/ibadah/page"));
const attendanceChartConfig = {
  rate: { label: "Attendance rate", color: "var(--primary)" },
} satisfies ChartConfig;
const homeworkChartConfig = {
  rate: { label: "Homework submission rate", color: "var(--primary)" },
} satisfies ChartConfig;

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const [ibadahDrawerOpen, setIbadahDrawerOpen] = useState(false);
  const { activeClassId, isLoading: loadingClass } = useActiveClass();
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
      weekday: "long",
      day: "numeric",
      month: "long",
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
  const overallAttendance = useAttendanceSummary(
    { clientId, token },
    undefined,
    { refetchOnMount: "always" },
  );
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
  const homeworkCompleted = Math.min(
    total,
    homework.data?.completedStudents ?? 0,
  );
  const homeworkPending = Math.max(0, total - homeworkCompleted);
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
  const attendanceRecords = attendance.data?.records ?? [];
  const presentCount = attendanceRecords.filter(
    (record) => record.status === "PRESENT",
  ).length;
  const absentCount = attendanceRecords.filter(
    (record) => record.status === "ABSENT",
  ).length;
  const markedCount = attendance.data?.total ?? 0;
  const unmarkedCount = Math.max(0, total - markedCount);
  const attendancePercent =
    total > 0 ? Math.min(100, Math.round((markedCount / total) * 100)) : 0;
  const attendanceTaken = markedCount > 0;
  const overall = overallAttendance.data;
  const overallPresent = overall?.present ?? 0;
  const overallAbsent =
    overall?.byStatus.find((entry) => entry.status === "ABSENT")?._count.id ??
    0;
  const overallRate = Math.max(0, Math.min(100, overall?.rate ?? 0));
  const loadingAttendance =
    loadingClass ||
    (!!activeClassId && (students.isLoading || attendance.isLoading));
  const attendanceError = students.isError || attendance.isError;
  const completed = Math.min(
    total,
    new Set(ibadah.data?.logs.map((log) => log.studentId) ?? []).size,
  );
  const remaining = Math.max(0, total - completed);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = `hsl(${percent * 1.2} 75% 60%)`;
  const tint = `hsl(${percent * 1.2} 75% 60% / 0.005)`;
  const loadingIbadah =
    loadingClass ||
    (!!activeClassId && (students.isLoading || ibadah.isLoading));
  const ibadahError = students.isError || ibadah.isError;
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
      title: t("nav", "notifications", lang),
      href: "/teacher/notifications",
      icon: Bell,
    },
  ];

  return (
    <DashboardLayout>
      <div className="">
        <header className="mb-4 flex min-h-[104px] items-center justify-between gap-4   ">
          <div className="min-w-0">
            <p className="mb-1 text-lg font-medium leading-7 text-gray-700 sm:text-2xl">
              {t("common", "teacher", lang)}
            </p>
            <h1 className="break-words text-2xl font-bold leading-tight tracking-tight text-gray-950 sm:text-[34px]">
              {user?.name ?? "Teacher"} <span aria-hidden="true">👋</span>
            </h1>
          </div>
          <Avatar className="size-16 shrink-0 ring-2 ring-gray-200 sm:size-20">
            <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-gray-100 text-xl font-semibold text-gray-700">
              {initials}
            </AvatarFallback>
          </Avatar>
        </header>

        <section className="mb-7">
          <button
            type="button"
            onClick={() => setIbadahDrawerOpen(true)}
            disabled={!activeClassId}
            aria-label={`${t("teacherPages", "previousDayIbadah", lang)}: ${dateLabel}`}
            className="card block w-full rounded-2xl p-5 text-left shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-default disabled:hover:translate-y-0 sm:p-6"
            style={{
              background: `linear-gradient(90deg, ${tint} 0%, transparent 100%)`,
            }}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <Icon
                    icon="tabler:clock"
                    aria-hidden="true"
                    className="size-4 shrink-0 *:stroke-[1.2px]"
                  />
                  {dateLabel}
                </span>
                <span className="mt-2 block text-xl font-bold tabular-nums text-gray-950">
                  {t("teacherPages", "ibadahTrackingDescription", lang)}{" "}
                </span>
              </span>
              {!loadingIbadah && !ibadahError && !!activeClassId && (
                <span
                  className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums"
                  style={{ color, backgroundColor: tint }}
                >
                  {percent}%
                </span>
              )}
            </span>
            {!loadingIbadah && !ibadahError && !!activeClassId && (
              <>
                <span
                  role="progressbar"
                  aria-label={t("teacherPages", "previousDayIbadah", lang)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  className="mt-5 block h-2 overflow-hidden rounded-full bg-gray-200/70"
                >
                  <span
                    className="block h-full rounded-full transition-[width]"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                  />
                </span>
                <span className="mt-5 flex items-end justify-between gap-3   pt-0">
                  <span className="grid flex-1 grid-cols-3 gap-2">
                    {[
                      {
                        label: t("teacherPages", "totalStudents", lang),
                        value: total,
                      },
                      {
                        label: t("teacherPages", "completedStudents", lang),
                        value: completed,
                      },
                      {
                        label: t("teacherPages", "pendingIbadahStudents", lang),
                        value: remaining,
                      },
                    ].map((stat) => (
                      <span
                        key={stat.label}
                        className="min-w-0 not-last:border-r-1 border-gray-200 text-center justify-center"
                      >
                        <span className="mt-1 block text-3xl font-semibold tabular-nums text-gray-900">
                          {stat.value}
                        </span>
                        <span className="block text-[13px] leading-tight text-gray-900">
                          {stat.label}
                        </span>
                      </span>
                    ))}
                  </span>
                  {/* <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-gray-500"
                  /> */}
                </span>
              </>
            )}
          </button>
        </section>
        <section
          aria-labelledby="attendance-overview-title"
          className="mb-7 overflow-hidden  card p-4 rounded-2xl "
        >
          <h2
            id="attendance-overview-title"
            className="  block text-xl    font-bold tabular-nums text-gray-950"
          >
            {t("teacherPages", "overallAttendance", lang)}
          </h2>
          <div className="  mt-3">
            <div className=" overflow-hidden rounded-t-2xl ">
              {overallAttendance.isLoading ? (
                <div className="pt-5 text-sm text-gray-500">
                  {t("common", "loading", lang)}
                </div>
              ) : overallAttendance.isError ? (
                <div className="pt-5 text-sm text-gray-500">
                  {t("teacherPages", "chartUnavailable", lang)}
                </div>
              ) : (
                <div className=" grid grid-cols-2 gap-0.5">
                  {[
                    {
                      label: t("common", "present", lang),
                      value: overallPresent,
                      icon: UserCheck,
                      surface: "bg-violet-50",
                      iconSurface: "bg-violet-200 text-violet-700",
                    },
                    {
                      label: t("common", "absent", lang),
                      value: overallAbsent,
                      icon: UserX,
                      surface: "bg-amber-50",
                      iconSurface: "bg-amber-200 text-amber-800",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`flex min-h-18 items-center justify-between gap-1  p-3 ${stat.surface}`}
                    >
                      <div className="min-w-0">
                        <strong className="block text-3xl font-semibold tabular-nums text-gray-950">
                          {stat.value}
                        </strong>
                        <p className="text-sm font-bold text-gray-700">
                          {stat.label}
                        </p>
                      </div>
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center  ${stat.iconSurface}`}
                      >
                        <stat.icon aria-hidden="true" className="size-5" />
                      </span>
                    </div>
                  ))}
                  <div className="flex min-h-18 items-center justify-between gap-1  bg-emerald-50 p-3">
                    <div className="min-w-0">
                      <strong className="block text-3xl font-semibold tabular-nums text-gray-950">
                        {overallRate}%
                      </strong>
                      <p className="text-sm font-bold  leading-tight text-gray-700">
                        {t("teacherPages", "attendanceRateLabel", lang)}
                      </p>
                    </div>
                    <div className="size-11 shrink-0">
                      <ChartContainer
                        config={attendanceChartConfig}
                        className="size-full"
                        role="img"
                        aria-label={t(
                          "teacherPages",
                          "attendanceRateLabel",
                          lang,
                        )}
                      >
                        <RadialBarChart
                          data={[{ rate: overallRate, fill: "var(--primary)" }]}
                          startAngle={90}
                          endAngle={-270}
                          innerRadius="72%"
                          outerRadius="100%"
                        >
                          <PolarRadiusAxis
                            type="number"
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <RadialBar
                            dataKey="rate"
                            background
                            cornerRadius={8}
                          />
                        </RadialBarChart>
                      </ChartContainer>
                    </div>
                  </div>
                  <div className="flex min-h-18 items-center justify-between gap-1  bg-green-50 p-3">
                    <div className="min-w-0">
                      <strong className="block text-3xl font-semibold tabular-nums text-gray-950">
                        {overall?.total ?? 0}
                      </strong>
                      <p className="text-sm font-bold text-gray-700">
                        {t("teacherPages", "totalRecords", lang)}
                      </p>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center   bg-green-200 text-green-700">
                      <UsersRound aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-100 ">
            {!activeClassId && !loadingClass ? (
              <p className="mt-2 text-sm text-gray-500">
                {t("teacherPages", "noClassesFound", lang)}
              </p>
            ) : loadingAttendance ? (
              <p className="mt-2 text-sm text-gray-500">
                {t("common", "loading", lang)}
              </p>
            ) : attendanceError ? (
              <p className="mt-2 text-sm text-gray-500">
                {t("teacherPages", "chartUnavailable", lang)}
              </p>
            ) : attendanceTaken ? (
              <>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-600">
                      {t("teacherPages", "markedStudents", lang)}
                    </p>
                    <p className="text-xl font-semibold tabular-nums text-gray-950">
                      {markedCount}/{total}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary-700">
                    {attendancePercent}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t("teacherPages", "markedStudents", lang)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={attendancePercent}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"
                >
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${attendancePercent}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t("common", "present", lang),
                      value: presentCount,
                    },
                    { label: t("common", "absent", lang), value: absentCount },
                    {
                      label: t("teacherPages", "unmarkedLabel", lang),
                      value: unmarkedCount,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg bg-gray-50 px-2 py-1.5 text-center"
                    >
                      <p className="text-base font-semibold tabular-nums text-gray-900">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-600">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="relative mt-[0.5px] min-h-38 card overflow-hidden rounded-b-2xl bg-cyan-50">
                <img
                  src="/imgs/attendance/roll-call-banner.png"
                  alt=""
                  className="absolute inset-0 size-full object-cover object-center"
                />
                <div className="relative  z-10 flex min-h-38 max-w-[65%] flex-col justify-center p-5">
                  <p className="mt-1 text-lg text-gray-700 font-bold">
                    {t("teacherPages", "takeAttendanceInstruction", lang)}
                  </p>
                  <div className=" mt-3 ">
                    <Button
                      onClick={() => navigate("/teacher/attendance")}
                      className=""
                      size={"lg"}
                    >
                      {attendanceTaken
                        ? t("teacherPages", "reviewAttendance", lang)
                        : t("teacherPages", "markAttendanceDesc", lang)}
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="homework-overview-title"
          className="mb-7 rounded-2xl card bg-primary-100/20 text-whit p-6"
        >
          <div className="flex flex-col  justify-between gap-3">
            <h2
              id="homework-overview-title"
              className=" block text-xl font-bold tabular-nums text-gray-950"
            >
              {t("teacherPages", "classHomework", lang)}
            </h2>
            <img
              src="/imgs/homework/1.webp"
              alt=""
              loading="lazy"
              className="mx-auto h-36 w-auto max-w-full object-contain"
            />
            <Button
              size="lg"
              className={"w-max mx-auto"}
              onClick={() => navigate("/teacher/homework-list")}
            >
              {t("teacherPages", "hwListTitle", lang)}
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {!activeClassId && !loadingClass ? (
            <p className="mt-4 text-sm text-gray-500">
              {t("teacherPages", "noClassesFound", lang)}
            </p>
          ) : loadingClass || students.isLoading || homework.isLoading ? (
            <p className="mt-4 text-sm text-gray-500">
              {t("common", "loading", lang)}
            </p>
          ) : students.isError || homework.isError ? (
            <p className="mt-4 text-sm text-gray-500">
              {t("teacherPages", "homeworkStatsUnavailable", lang)}
            </p>
          ) : homework.data?.assignments === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              {t("teacherPages", "noAssignmentsYet", lang)}
            </p>
          ) : (
            <div className="mt-6 flex   gap-2 justify-between">
              {[
                {
                  label: t("teacherPages", "completedStudents", lang),
                  value: homeworkCompleted,
                },
                {
                  label: t("teacherPages", "pendingHw", lang),
                  value: homeworkPending,
                },
                {
                  label: t("teacherPages", "submittedStatus", lang),
                  value: homeworkPercent + "%",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="px-2 w-full not-last:border-r  border-gray-200 text-center"
                >
                  <strong className="block text-3xl font-semibold tabular-nums text-gray-900">
                    {stat.value}
                  </strong>
                  <span className="block text-[13px] leading-tight text-gray-900">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <Drawer open={ibadahDrawerOpen} onOpenChange={setIbadahDrawerOpen}>
          <DrawerContent className="h-[90dvh] max-h-[90dvh] bg-white">
            <DrawerHeader className="flex-row items-center justify-between border-b border-gray-100 pb-4 text-left">
              <DrawerTitle className="text-base font-semibold">
                {t("teacherPages", "ibadahRecordsTitle", lang)}
              </DrawerTitle>
              <DrawerClose
                aria-label={t("common", "close", lang)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X className="size-5" />
              </DrawerClose>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
              {ibadahDrawerOpen && (
                <Suspense
                  fallback={
                    <p className="py-8 text-center text-sm text-gray-500">
                      {t("common", "loading", lang)}
                    </p>
                  }
                >
                  <TeacherIbadahPage initialDate={date} embedded />
                </Suspense>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        <section
          aria-labelledby="teacher-actions"
          className="card mb-0 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h2
            id="teacher-actions"
            className=" block text-xl font-bold mb-4 tabular-nums text-gray-950"
          >
            {t("teacherPages", "quickActions", lang)}
          </h2>
          <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5">
            {actions.map((action) => (
              <li key={action.href} className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="flex min-h-24 w-full flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  <span className="flex btn size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <action.icon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="min-w-0 text-xs font-semibold leading-snug text-gray-800 sm:text-sm">
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
