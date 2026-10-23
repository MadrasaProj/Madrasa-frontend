import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { getClassIbadah } from "@/lib/ibadah-api";
import { useStudentsList } from "@/lib/queries";
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

const TeacherIbadahPage = lazy(() => import("@/app/teacher/ibadah/page"));

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
  const total = students.data?.total ?? 0;
  const completed = Math.min(
    total,
    new Set(ibadah.data?.logs.map((log) => log.studentId) ?? []).size,
  );
  const remaining = Math.max(0, total - completed);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = `hsl(${percent * 1.2} 75% 60%)`;
  const tint = `hsl(${percent * 1.2} 75% 60% / 0.05)`;
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
      title: t("teacherPages", "markAttendanceBtn", lang),
      href: "/teacher/attendance",
    },
    { title: t("common", "present", lang), href: "/teacher/present" },
    { title: t("common", "absent", lang), href: "/teacher/absent" },
    { title: t("nav", "homework", lang), href: "/teacher/homework" },
    {
      title: t("teacherPages", "hwOverviewAction", lang),
      href: "/teacher/homework-list",
    },
    { title: t("nav", "ibadah", lang), href: "/teacher/ibadah" },
    { title: t("nav", "exams", lang), href: "/teacher/exams" },
    { title: t("nav", "performance", lang), href: "/teacher/performance" },
    { title: t("nav", "diary", lang), href: "/teacher/diary" },
    { title: t("nav", "notifications", lang), href: "/teacher/notifications" },
  ];

  return (
    <DashboardLayout>
      <div className="">
        <header className="mb-4 flex min-h-[104px] items-center justify-between gap-4 bg-[#f9f9fc] ">
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
                <span className="mt-2 block text-2xl font-bold tabular-nums text-gray-950">
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
                      <span key={stat.label} className="min-w-0 not-last:border-r-1 border-gray-200 text-center justify-center">
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

        <section aria-labelledby="teacher-actions" className="pb-20">
          <h2
            id="teacher-actions"
            className="mb-3 text-base font-semibold text-gray-900"
          >
            {t("teacherPages", "quickActions", lang)}
          </h2>
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {actions.map((action) => (
              <li key={action.href}>
                <button
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  <span>{action.title}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-gray-400"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
