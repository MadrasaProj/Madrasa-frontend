import { DashboardLayout } from "@/components/DashboardLayout";
import { BestPerformerCard } from "@/components/parent/BestPerformerCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useRefreshParentStudents } from "@/lib/hooks/useRefreshParentStudents";
import { useBestPerformers, useUnreadCount } from "@/lib/queries";
import { periodDates } from "@/lib/best-performance-period";
import {
  ClipboardList,
  BookOpen,
  CreditCard,
  GraduationCap,
  Bell,
  Moon,
  User,
  ChevronRight,
} from "lucide-react";

export default function ParentDashboard() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  useRefreshParentStudents();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const { data: unreadData, isLoading: loadingUnread } = useUnreadCount({ clientId: cid, token });
  const unread = unreadData?.count ?? 0;
  const childCount = user?.accessibleStudentIds?.length ?? 0;
  const activeId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? "";
  const activeStudent = user?.accessibleStudents?.find((student) => student.id === activeId);
  const { data: performance, isLoading: loadingPerformance, error: performanceError } = useBestPerformers(
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
  const locale = lang === "ml" ? "ml-IN" : "en-GB";
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const initials = (user?.name?.trim() || "Parent").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const actions = [
    { title: t("parentPages", "studentProfile", lang), icon: User, href: "/parent/students", desc: t("parentPages", "viewProfileDetails", lang) },
    { title: t("parentPages", "attendanceTitle", lang), icon: ClipboardList, href: "/parent/attendance", desc: t("parentPages", "attendanceSub", lang) },
    { title: t("parentPages", "homeworkTitle", lang), icon: BookOpen, href: "/parent/homework", desc: t("parentPages", "homeworkSub", lang) },
    { title: t("parentPages", "feesTitle", lang), icon: CreditCard, href: "/parent/fees", desc: t("parentPages", "feesSub", lang) },
    { title: t("parentPages", "resultsTitle", lang), icon: GraduationCap, href: "/parent/results", desc: t("parentPages", "resultsSub", lang) },
    { title: t("parentPages", "ibadahTitle", lang), icon: Moon, href: "/parent/ibadah", desc: t("parentPages", "ibadahSub", lang) },
    { title: t("parentPages", "notifTitle", lang), icon: Bell, href: "/parent/notifications", desc: unread > 0 ? `${unread} ${t("parentPages", "unreadLabel", lang).toLowerCase()}` : t("parentPages", "notifSub", lang) },
  ];

  return (
    <DashboardLayout>
      <header className="mb-2 flex flex-col items-center gap-3   pb-4 text-center !pt-20">
        <Avatar className="size-20 ring-2 ring-primary-100 sm:size-16">
          <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-primary-100 text-xl font-semibold text-primary-800">{initials}</AvatarFallback>
        </Avatar>
        <div className=" space-y-2 mt-2 min-w-0 flex-wrap items-center justify-center gap-2">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{user?.name ?? t("common", "parent", lang)}</h1>
          <div className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            {t("common", "parent", lang)}
          </div>
        </div>
      </header>

      <section aria-labelledby="parent-overview" aria-busy={loadingUnread} className="mb-7">
         
        <div className="grid grid-cols-2 divide-x divide-gray-200 py-4 sm:py-5">
          {[
            { label: t("parentPages", "childrenLabel", lang), value: childCount },
            { label: t("parentPages", "unreadLabel", lang), value: loadingUnread ? "—" : unread },
          ].map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col items-center px-3 text-center sm:px-5 font-semibold">
              <div className=" text-[18px]   leading-none tracking-tight text-gray-900 tabular-nums  ">{stat.value}</div>
              <div className=" text-[11px] mt-1  leading-tight text-gray-700  ">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {activeId && (
        <section aria-labelledby="parent-best-performance" className="mb-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="parent-best-performance" className="text-base font-semibold text-gray-900">
              {t("parentPages", "bestIbadahPerf", lang)}
            </h2>
            <button
              type="button"
              onClick={() => navigate("/parent/best-performance")}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {t("common", "view", lang)}
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          {loadingPerformance ? (
            <Skeleton className="mx-auto h-72 max-w-md rounded-[30px]" />
          ) : performanceError ? (
            <p role="alert" className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {performanceError.message}
            </p>
          ) : activePerformer ? (
            <motion.div
              className="mx-auto max-w-[480px] overflow-hidden rounded-[30px] bg-primary/5 px-4 py-8 sm:px-8"
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
              transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
            >
              <BestPerformerCard
                performer={activePerformer}
                rank={activeRank}
                isMyChild
                customItems={performance?.customItems}
                lang={lang}
              />
            </motion.div>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              {t("parentPages", "noIbadahData", lang)}
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="parent-actions" className="pb-0">
        <h2 id="parent-actions" className="mb-3 text-base font-semibold text-gray-900">{t("parentPages", "quickAccess", lang)}</h2>
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
          {actions.map((action) => (
            <li key={action.href} className="border-b border-gray-100 last:border-b-0">
              <button type="button" onClick={() => navigate(action.href)} className="group flex w-full items-center gap-3 rounded-lg py-3.5 text-left transition-colors hover:bg-primary-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <action.icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-relaxed text-gray-800">{action.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{action.desc}</span>
                </span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-primary-700" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </DashboardLayout>
  );
}
