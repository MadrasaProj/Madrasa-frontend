import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BookOpen, FileText, Moon, GraduationCap,
  Star, Bell, Users, TrendingUp, ChevronRight,
} from "lucide-react";
import { useHomeworkList, useAttendanceSummary, useUnreadCount } from "@/lib/queries";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const locale = lang === "ml" ? "ml-IN" : "en-GB";
  const week = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setMilliseconds(-1);
    return { from: start.toISOString(), to: end.toISOString(), start };
  }, []);

  const { data: hwData, isLoading: loadingHw } = useHomeworkList({ clientId: cid, token });
  const { data: dueHomework, isLoading: loadingDue, isError: dueError } = useHomeworkList({ clientId: cid, token }, { from: week.from, to: week.to });
  const { data: attData, isLoading: loadingAtt, isError: attendanceError } = useAttendanceSummary({ clientId: cid, token });
  const { data: unreadData, isLoading: loadingUnread } = useUnreadCount({ clientId: cid, token });

  const stats = {
    hw: hwData?.length ?? 0,
    att: attData?.rate ?? 0,
    unread: unreadData?.count ?? 0,
  };
  const loading = loadingHw || loadingAtt || loadingUnread;

  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const initials = (user?.name?.trim() || "Teacher").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const attendanceData = [
    { key: "present", value: attData?.present ?? 0, fill: "var(--chart-4)" },
    { key: "other", value: Math.max(0, (attData?.total ?? 0) - (attData?.present ?? 0)), fill: "var(--chart-1)" },
  ];
  const attendanceConfig = {
    present: { label: t("common", "present", lang), color: "var(--chart-4)" },
    other: { label: t("teacherPages", "otherAttendance", lang), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const homeworkConfig = {
    count: { label: t("teacherPages", "chartAssignments", lang), color: "var(--chart-4)" },
  } satisfies ChartConfig;
  const homeworkDueData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(week.start);
    date.setDate(week.start.getDate() + index);
    return {
      key: date.toDateString(),
      day: date.toLocaleDateString(locale, { weekday: "short" }),
      count: dueHomework?.filter((assignment) => new Date(assignment.dueDate).toDateString() === date.toDateString()).length ?? 0,
    };
  });
  const dueCount = homeworkDueData.reduce((sum, day) => sum + day.count, 0);

  const actions = [
    { title: t("teacherPages", "markAttendanceBtn", lang), icon: ClipboardList, href: "/teacher/attendance", desc: t("teacherPages", "markAttendanceDesc", lang) },
    { title: t("common", "present", lang),                 icon: Users,         href: "/teacher/present",    desc: t("teacherPages", "presentActionDesc", lang) },
    { title: t("common", "absent", lang),                  icon: TrendingUp,    href: "/teacher/absent",     desc: t("teacherPages", "absentActionDesc", lang) },
    { title: t("nav", "homework", lang),                   icon: BookOpen,      href: "/teacher/homework",   desc: t("teacherDash", "assignTrack", lang) },
    { title: t("teacherPages", "hwOverviewAction", lang),  icon: FileText,      href: "/teacher/homework-list", desc: t("teacherPages", "hwOverviewDesc", lang) },
    { title: t("nav", "ibadah", lang),                     icon: Moon,          href: "/teacher/ibadah",     desc: t("teacherDash", "trackPrayers", lang) },
    { title: t("nav", "exams", lang),                      icon: GraduationCap, href: "/teacher/exams",      desc: t("teacherDash", "examMarks", lang) },
    { title: t("nav", "performance", lang),                icon: Star,          href: "/teacher/performance", desc: t("teacherPages", "classAnalytics", lang) },
    { title: t("nav", "diary", lang),                      icon: FileText,      href: "/teacher/diary",      desc: t("teacherPages", "classDiary", lang) },
    { title: t("nav", "notifications", lang),              icon: Bell,          href: "/teacher/notifications", desc: stats.unread > 0 ? t("teacherPages", "unreadAction", lang).replace("{n}", String(stats.unread)) : t("teacherPages", "inboxLabel", lang) },
  ];

  return (
    <DashboardLayout>
      <header className="mb-8 flex items-center gap-4 border-b border-gray-200 pb-7">
        <Avatar className="size-14 shrink-0 ring-2 ring-emerald-100 sm:size-16">
          <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-emerald-100 text-xl font-semibold text-emerald-800">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="mb-1 text-sm text-emerald-700">{t("login", "welcomeBack", lang)}</p>
          <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{user?.name ?? "Teacher"}</h1>
          <p className="mt-1 text-xs text-gray-500">{today}</p>
        </div>
      </header>

      <section aria-labelledby="teacher-overview" aria-busy={loading} className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="teacher-overview" className="text-base font-semibold text-gray-900">{t("common", "overview", lang)}</h2>
          {loading && <span role="status" className="text-xs text-gray-500">{t("common", "loading", lang)}</span>}
        </div>
        <dl className="grid grid-cols-3 divide-x divide-gray-200 rounded-2xl border border-gray-200 bg-white py-4 sm:py-5">
          {[
            { label: t("teacherPages", "hwActive", lang), value: stats.hw, loading: loadingHw },
            { label: t("teacherPages", "attRate", lang), value: `${stats.att}%`, loading: loadingAtt },
            { label: t("teacherPages", "unreadLabel", lang), value: stats.unread, loading: loadingUnread },
          ].map((s) => (
            <div key={s.label} className="min-w-0 px-3 sm:px-5">
              <dt className="text-[11px] leading-tight text-gray-500 sm:text-xs">{s.label}</dt>
              <dd className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums sm:text-3xl">{s.loading ? "—" : s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label={t("common", "overview", lang)} className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 rounded-2xl bg-white py-0">
          <CardHeader className="border-b border-gray-100 py-5">
            <CardTitle className="font-semibold">{t("teacherPages", "attendanceSnapshot", lang)}</CardTitle>
            <CardDescription className="text-xs">{t("teacherPages", "recordedAttendance", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="py-5">
            {loadingAtt ? (
              <div role="status" className="flex h-[220px] items-center justify-center text-sm text-gray-500">{t("common", "loading", lang)}</div>
            ) : attendanceError ? (
              <div role="status" className="flex h-[220px] items-center justify-center text-sm text-gray-500">{t("teacherPages", "chartUnavailable", lang)}</div>
            ) : attData?.total ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div className="relative w-full max-w-[260px]">
                  <ChartContainer config={attendanceConfig} className="mx-auto h-[220px] w-full" role="img" aria-label={`${t("teacherPages", "attendanceSnapshot", lang)}: ${stats.att}%`}>
                    <PieChart accessibilityLayer>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={attendanceData} dataKey="value" nameKey="key" innerRadius={70} outerRadius={96} strokeWidth={0}>
                        {attendanceData.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{stats.att}%</span>
                    <span className="text-xs text-gray-500">{t("teacherPages", "attRate", lang)}</span>
                  </div>
                </div>
                <dl className="grid w-full grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm sm:w-auto sm:min-w-36 sm:grid-cols-1 sm:border-t-0 sm:pt-0">
                  {attendanceData.map((entry) => (
                    <div key={entry.key} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <dt className="text-gray-500">{attendanceConfig[entry.key as keyof typeof attendanceConfig].label}</dt>
                      <dd className="ml-auto font-semibold text-gray-900 tabular-nums">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-gray-500">{t("teacherPages", "noAttendanceChart", lang)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-2xl bg-white py-0">
          <CardHeader className="border-b border-gray-100 py-5">
            <CardTitle className="font-semibold">{t("teacherPages", "homeworkDue", lang)}</CardTitle>
            <CardDescription className="text-xs">{t("teacherPages", "nextSevenDays", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="py-5">
            {loadingDue ? (
              <div role="status" className="flex h-[220px] items-center justify-center text-sm text-gray-500">{t("common", "loading", lang)}</div>
            ) : dueError ? (
              <div role="status" className="flex h-[220px] items-center justify-center text-sm text-gray-500">{t("teacherPages", "chartUnavailable", lang)}</div>
            ) : dueCount > 0 ? (
              <ChartContainer config={homeworkConfig} className="h-[220px] w-full" role="img" aria-label={`${t("teacherPages", "homeworkDue", lang)}: ${dueCount}`}>
                <BarChart accessibilityLayer data={homeworkDueData} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-center text-sm text-gray-500">{t("teacherPages", "noUpcomingHomework", lang)}</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="teacher-actions" className="pb-20">
        <h2 id="teacher-actions" className="mb-3 text-base font-semibold text-gray-900">{t("teacherPages", "quickActions", lang)}</h2>
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
          {actions.map((a) => (
            <li key={a.href} className="border-b border-gray-100 last:border-b-0">
              <button type="button" onClick={() => navigate(a.href)} className="group flex w-full items-center gap-3 rounded-lg py-3.5 text-left transition-colors hover:bg-emerald-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <a.icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-relaxed text-gray-800">{a.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{a.desc}</span>
                </span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-emerald-700" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </DashboardLayout>
  );
}
