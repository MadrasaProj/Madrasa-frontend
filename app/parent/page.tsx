import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useRefreshParentStudents } from "@/lib/hooks/useRefreshParentStudents";
import { useUnreadCount } from "@/lib/queries";
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
  const { user, accessToken } = useAuthStore();
  useRefreshParentStudents();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const { data: unreadData, isLoading: loadingUnread } = useUnreadCount({ clientId: cid, token });
  const unread = unreadData?.count ?? 0;
  const childCount = user?.accessibleStudentIds?.length ?? 0;
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
      <header className="mb-2 pb-4 flex items-center gap-4 border-b border-gray-200 ">
        <Avatar className="size-14 shrink-0 ring-2 ring-primary-100 sm:size-16">
          <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-primary-100 text-xl font-semibold text-primary-800">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <span className="mb-1 inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            {t("parentPages", "parentPortal", lang)}
          </span>
          <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{user?.name ?? t("parentPages", "parentPortal", lang)}</h1>
         </div>
      </header>

      <section aria-labelledby="parent-overview" aria-busy={loadingUnread} className="mb-7">
         
        <dl className="grid grid-cols-2 divide-x divide-gray-200 py-4 sm:py-5">
          {[
            { label: t("parentPages", "childrenLabel", lang), value: childCount },
            { label: t("parentPages", "unreadLabel", lang), value: loadingUnread ? "—" : unread },
          ].map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col items-center px-3 text-center sm:px-5">
              <dt className="order-2 text-[11px] leading-tight text-gray-700 sm:text-xs">{stat.label}</dt>
              <dd className="order-1 text-2xl font-semibold leading-none tracking-tight text-gray-900 tabular-nums sm:text-3xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

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
