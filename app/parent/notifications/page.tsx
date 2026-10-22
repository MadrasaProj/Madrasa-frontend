import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/queries";
import {
  Bell, BookOpen, ClipboardList, GraduationCap, CreditCard,
  FileText, RefreshCw, CheckCheck, ExternalLink,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT:      { icon: Bell,          color: "text-indigo-700", bg: "bg-indigo-100" },
  ATTENDANCE_ALERT:  { icon: ClipboardList, color: "text-primary-700", bg: "bg-primary-100" },
  FEE_REMINDER:      { icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-100" },
  HOMEWORK_REMINDER: { icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-100" },
  EXAM_NOTICE:       { icon: GraduationCap, color: "text-indigo-700",  bg: "bg-indigo-100" },
  GENERAL:           { icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100" },
};

export default function ParentNotificationsPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, isRefetching } = useNotifications(
    { clientId: cid, token },
    { take: 60 },
  );
  const notifs = data?.notifications ?? [];

  const markRead = useMarkNotificationRead({ clientId: cid, token });
  const markAll  = useMarkAllNotificationsRead({ clientId: cid, token });

  const handleClick = (n: typeof notifs[number]) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  const handleRead = (id: string) => markRead.mutate(id);

  const markAllRead = () => {
    const unread = notifs.filter((n) => !n.isRead);
    if (unread.length) markAll.mutate(unread);
  };

  const unread = notifs.filter((n) => !n.isRead).length;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "notifPageTitle", lang)} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {unread > 0 ? `${unread} ${t("parentPages", "unreadLabel", lang).toLowerCase()}` : t("parentPages", "allCaughtUpMsg", lang)}
        </p>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} disabled={markAll.isPending}
              className="rounded-xl bg-gray-100 p-2 text-gray-600 disabled:opacity-50"
              title={t("parentPages", "markAllReadBtn", lang)} aria-label={t("parentPages", "markAllReadBtn", lang)}>
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => refetch()} disabled={isRefetching}
            className="rounded-xl bg-gray-100 p-2 text-gray-600 disabled:opacity-50"
            title={t("parentPages", "notifRefresh", lang)} aria-label={t("parentPages", "notifRefresh", lang)}>
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {errorMessage && <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          {t("parentPages", "noNotificationsYet", lang)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white mb-20">
          <Table className="min-w-[680px]">
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="w-[55%]">{t("parentPages", "notifPageTitle", lang)}</TableHead>
                <TableHead scope="col">{t("parentPages", "notifFrom", lang)}</TableHead>
                <TableHead scope="col">{t("parentPages", "dateLabel", lang)}</TableHead>
                <TableHead scope="col">{t("parentPages", "statusLabel", lang)}</TableHead>
                <TableHead scope="col"><span className="sr-only">{t("parentPages", "notifActions", lang)}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifs.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
                const Icon = cfg.icon;
                return (
                  <TableRow key={n.id} className={cn(!n.isRead && "bg-blue-50/40")}>
                    <TableCell className="whitespace-normal">
                      <button onClick={() => handleClick(n)} className="flex w-full items-start gap-3 text-left">
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                          <Icon className={cn("h-4 w-4", cfg.color)} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                            {n.title}{n.actionUrl && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">{n.body}</span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-gray-600">{n.creator?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", n.isRead ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                        {n.isRead ? t("parentPages", "notifRead", lang) : t("parentPages", "unreadLabel", lang)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {!n.isRead && (
                        <button onClick={() => handleRead(n.id)}
                          className="whitespace-nowrap text-xs font-semibold text-blue-600 hover:underline">
                          {t("parentPages", "notifMarkRead", lang)}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardLayout>
  );
}
