import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DrawerSelector } from "@/components/DrawerSelector";
import { TeacherAttendanceDrawer } from "@/components/teacher/TeacherAttendanceDrawer";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
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
import { useQuery } from "@tanstack/react-query";
import { getClassIbadah } from "@/lib/ibadah-api";
import { getClassAttendance } from "@/lib/attendance-api";
import { getSubmissions, listHomework } from "@/lib/homework-api";
import { useStudentsList } from "@/lib/queries";
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
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

const ibadahChartConfig = {
  completed: { color: "#059669" },
} satisfies ChartConfig;

const attendanceChartConfig = {
  present: { color: "var(--primary)" },
  absent: { color: "#fca5a5" },
  other: { color: "#94a3b8" },
} satisfies ChartConfig;

const homeworkChartConfig = {
  submitted: { color: "var(--primary)" },
  remaining: { color: "#e5e7eb" },
} satisfies ChartConfig;

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const [ibadahDrawerOpen, setIbadahDrawerOpen] = useState(false);
  const [attendanceDrawerOpen, setAttendanceDrawerOpen] = useState(false);
  const {
    classes: teacherClasses,
    activeClass,
    activeClassId,
    setActiveClassId,
    isLoading: loadingClass,
  } = useActiveClass();
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
  const otherCount = attendanceRecords.length - presentCount - absentCount;
  const attendancePercent = attendanceRecords.length > 0
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : 0;
  const markedCount = attendance.data?.total ?? 0;
  const attendanceTaken = markedCount > 0;
  const attendanceChartData = [
    { name: "present", value: presentCount },
    { name: "absent", value: absentCount },
    { name: "other", value: otherCount },
  ].filter((segment) => segment.value > 0);
  if (attendanceChartData.length === 0) {
    attendanceChartData.push({ name: "empty", value: 1 });
  }
  const loadingAttendance =
    loadingClass ||
    (!!activeClassId && (students.isLoading || attendance.isLoading));
  const openAttendanceDrawer = () => {
    if (activeClassId) setAttendanceDrawerOpen(true);
  };

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
  const homeworkChartData = [
    { name: "submitted", value: homeworkPercent },
    { name: "remaining", value: 100 - homeworkPercent },
  ];
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
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Avatar className="size-10 shrink-0 ring-2 ring-primary-100 sm:size-11">
              <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-primary-50 text-sm font-semibold text-primary-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 my-auto h-10 ">
              <h1 className="truncate text-lg font-bold tracking-tight text-gray-950 sm:text-xl">
                {user?.name ?? t("common", "teacher", lang)}{" "}
                <span aria-hidden="true">👋</span>
              </h1>
              <span className="relative -top-2 inline-flex rounded-full  text-[11px] font-semibold text-primary-700">
                {t("common", "teacher", lang)}
              </span>
            </div>
          </div>
          <DrawerSelector
            title={lang === "ml" ? "സജീവ ക്ലാസ്" : "Active class"}
            options={teacherClasses.map((cls) => ({
              value: cls.id,
              label: cls.name,
            }))}
            value={activeClassId}
            onChange={setActiveClassId}
            placeholder={t("teacherPages", "selectClassOpt", lang)}
            disabled={loadingClass}
            triggerItem={
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full   gap-1.5     px-3 "
              >
                {/* <School className="size-4" aria-hidden="true" /> */}
                <span className="min-w-0 truncate text-xs">
                  {activeClass?.name ?? t("common", "class", lang)}
                </span>
                <ChevronDown />
              </Button>
            }
          />
        </header>

        {/* Ibadah Card */}
        <section
          aria-labelledby="ibadah-card-heading"
          className="overflow-hidden mt-6 rounded-2xl  p-4 sm:p-5 shadow-xs transition-all hover:border-gray-200"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.6)), url('/imgs/teacher/dashboard-corner-primary.png')",
            backgroundPosition: "center, right bottom",
            backgroundSize: "cover, min(80%, 30rem) auto",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="text-center">
            <h2
              id="ibadah-card-heading"
              className="text-base font-bold text-gray-900 sm:text-lg"
            >
              {t("teacherPages", "ibadahTitle", lang)}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{dateLabel}</p>
          </div>

          <div
            className="relative mx-auto mt-4 size-40"
            role="img"
            aria-label={
              loadingIbadah
                ? t("common", "loading", lang)
                : `${ibadahPercent}% ${t("teacherPages", "completion", lang)}`
            }
          >
            <ChartContainer
              config={ibadahChartConfig}
              initialDimension={{ width: 160, height: 160 }}
              className="!aspect-auto size-40"
              aria-hidden="true"
            >
              <RadialBarChart
                data={[
                  { value: ibadahPercent, fill: "var(--color-completed)" },
                ]}
                startAngle={90}
                endAngle={-270}
                innerRadius={60}
                outerRadius={72}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  background={{ fill: "#e5e7eb" }}
                  cornerRadius={6}
                  isAnimationActive={false}
                />
              </RadialBarChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-gray-950">
                {loadingIbadah ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  `${ibadahPercent}%`
                )}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {t("teacherPages", "completion", lang)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-xl font-bold tabular-nums text-gray-950 sm:text-2xl">
                {loadingIbadah ? "—" : `${completed}`}
              </p>
              <p className="text-xs text-gray-500">
                {t("teacherPages", "ibadahTrackingDescription", lang)}
              </p>
            </div>
            <span className="h-9 w-px bg-gray-200" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold tabular-nums text-amber-700 sm:text-2xl">
                {loadingIbadah ? "—" : remaining}
              </p>
              <p className="text-xs text-gray-500">
                {t("teacherPages", "pendingIbadahStudents", lang)}
              </p>
            </div>
          </div>
          <div className="  pt-3 text-center">
            <Button
              variant="default"
              size="lg"
              onClick={() => setIbadahDrawerOpen(true)}
              disabled={!activeClassId}
              className=" rounded-full mt-2 gap-1.5 sm:w-auto"
            >
              {/* <MoonStar className="size-3.5" /> */}
              {t("teacherPages", "ibadahRecordsTitle", lang)}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </section>

        {/* Attendance Card */}
        <section
          aria-labelledby="attendance-card-heading"
          role="button"
          tabIndex={activeClassId ? 0 : -1}
          aria-disabled={!activeClassId}
          onClick={openAttendanceDrawer}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openAttendanceDrawer();
            }
          }}
          className="flex cursor-pointer items-center gap-3 rounded-2xl bg-linear-120 from-white via-primary-50 border-2 border-white to-white p-3 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
        >
          <img
            src="/imgs/attendance/attendance-checklist.png"
            alt=""
            className="size-14 shrink-0 object-contain sm:size-16"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <h2
              id="attendance-card-heading"
              className="text-sm font-bold text-gray-950 sm:text-base"
            >
              {loadingAttendance || attendanceTaken
                ? t("teacherPages", "todayAttendance", lang)
                : t("teacherPages", "markAttendanceDesc", lang)}
            </h2>
            {loadingAttendance ? (
              <p className="mt-0.5 text-xs text-gray-600">
                {t("common", "loading", lang)}
              </p>
            ) : attendanceTaken ? (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium sm:text-xs">
                <span className="inline-flex items-center gap-1 text-primary-800">
                  <span
                    className="size-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {presentCount} {t("common", "present", lang)}
                </span>
                <span className="inline-flex items-center gap-1 text-red-700">
                  <span
                    className="size-1.5 rounded-full bg-red-300"
                    aria-hidden="true"
                  />
                  {absentCount} {t("common", "absent", lang)}
                </span>
                {otherCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <span
                      className="size-1.5 rounded-full bg-slate-400"
                      aria-hidden="true"
                    />
                    {otherCount} {t("teacherPages", "otherAttendance", lang)}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-xs leading-snug text-gray-600 sm:text-sm">
                {t("teacherPages", "takeAttendanceInstruction", lang)}
              </p>
            )}
          </div>
          {loadingAttendance ? (
            <Loader2
              className="size-5 shrink-0 animate-spin text-primary-700"
              aria-hidden="true"
            />
          ) : attendanceTaken ? (
            <div
              className="relative size-16 shrink-0 rounded-full bg-white/70 p-1"
              role="img"
              aria-label={`${attendancePercent}% ${t("common", "present", lang)}, ${presentCount} ${t("common", "present", lang)}, ${absentCount} ${t("common", "absent", lang)}${otherCount > 0 ? `, ${otherCount} ${t("teacherPages", "otherAttendance", lang)}` : ""}`}
            >
              <ChartContainer
                config={attendanceChartConfig}
                initialDimension={{ width: 56, height: 56 }}
                className="!aspect-auto size-14"
                aria-hidden="true"
              >
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={21}
                    outerRadius={26}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {attendanceChartData.map((segment) => (
                      <Cell
                        key={segment.name}
                        fill={
                          segment.name === "empty"
                            ? "#d1d5db"
                            : `var(--color-${segment.name})`
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-gray-950">
                {attendancePercent}%
              </span>
            </div>
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm" aria-hidden="true">
              <ChevronRight className="size-5" />
            </span>
          )}
        </section>

        {/* Homework Card */}
        <section
          aria-labelledby="homework-card-heading"
          className="relative rounded-2xl border   bg-linear-to-br from-primary-50 to-white  p-4 shadow-xs sm:p-5"
        >
          <img
            src="/icons/homework/completed-notebook.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none  absolute -right-2 -bottom-12 z-10 size-50 -rotate-6 object-contain drop-shadow-[0_14px_12px_rgba(47,91,22,0.22)] sm:-right-4 sm:-top-9 sm:size-52"
            loading="lazy"
          />
            <h2
              id="homework-card-heading"
              className="text-base font-bold text-gray-900 sm:text-lg"
            >
              {t("teacherPages", "homeworkTitle", lang)}
            </h2>
          <div className="relative z-0 w-[55%] min-w-0">

            {loadingHomework ? (
              <div className="mt-2 flex min-h-20 items-center gap-2 text-sm text-gray-600">
                <Loader2 className="size-4 animate-spin" />
                {t("common", "loading", lang)}
              </div>
            ) : (homework.data?.assignments ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                {t("teacherPages", "noAssignmentsYet", lang)}
              </p>
            ) : (
              <div className="mt-2 flex flex-col items-left justify-start divide-y divide-primary-100 text-center">
                <div className="flex min-w-0 flex-1       px-1 py-1">
                  <p className="text-base font-semibold tabular-nums text-gray-950 sm:text-xl">
                    {homework.data?.assignments ?? 0}
                    <span className="text-sm font-medium text-gray-500 ml-2">
                      {t("teacherPages", "chartAssignments", lang)}
                    </span>
                  </p>
                </div>
                {/* <div className="flex min-w-0 flex-1      px-1 py-1">
                  <p className="text-base font-semibold tabular-nums text-gray-950 sm:text-xl">
                    {homeworkCompleted}
                    <span className="text-sm font-medium text-gray-500">
                      /{total}
                    </span>
                    <span className="text-sm font-medium text-gray-500 ml-2">
                      {t("teacherPages", "completedStudents", lang)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-gray-600 sm:text-xs"></p>
                </div> */}
                <div className="flex min-w-0 flex-1     px-1 py-1">
                  

                    <p className="text-base font-semibold tabular-nums text-gray-950 sm:text-xl">
                    {homeworkPercent}%
                    <span className="text-sm font-medium text-gray-500 ml-2">
                     {t(
                      "teacherPages",
                      "studentSubmissions",
                      lang,
                    ).toLowerCase()}
                    </span>
                  </p>
                  {/* <p className="mt-1 text-[10px] leading-tight text-gray-600 sm:text-xs">
                   
                   
                   
                    {homework.data?.submittedCount ?? 0}{" "}
                    {t(
                      "teacherPages",
                      "studentSubmissions",
                      lang,
                    ).toLowerCase()}
                  </p> */}
                </div>
              </div>
            )}
            <Button
              size="sm"
              onClick={() => navigate("/teacher/homework-list")}
              className="mt-4 h-9 rounded-full px-4"
            >
              {t("teacherPages", "hwListTitle", lang)}
              <ChevronRight className="size-4" />
            </Button>
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

        <TeacherAttendanceDrawer
          open={attendanceDrawerOpen}
          onOpenChange={setAttendanceDrawerOpen}
          initialClassId={activeClassId}
        />

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
