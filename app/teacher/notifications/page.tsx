import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { SkeletonList } from "@/components/ui/Skeleton";
import {
  getNotifications, markNotificationRead,
  type NotificationRecord,
} from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Bell, ExternalLink,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT:      { icon: Bell,          color: "text-indigo-700", bg: "bg-indigo-100" },
  ATTENDANCE_ALERT:  { icon: ClipboardList, color: "text-primary-700", bg: "bg-primary-100" },
  FEE_REMINDER:      { icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-100" },
  HOMEWORK_REMINDER: { icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-100" },
  EXAM_NOTICE:       { icon: GraduationCap, color: "text-indigo-700",  bg: "bg-indigo-100" },
  GENERAL:           { icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100" },
};

export default function TeacherNotificationsPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const navigate = useNavigate();

  const [notifs, setNotifs]       = useState<NotificationRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(cid, token, { take: 50 });
      setNotifs(data.notifications ?? []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [cid, token]);

  useEffect(() => { load(); }, [load]);

  const handleClick = async (n: NotificationRecord) => {
    if (!n.isRead) {
      await markNotificationRead(cid, token, n.id).catch(() => {});
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "notifTitle", lang)} />
      <p className="mb-4 text-sm text-gray-500">
        {unread > 0 ? `${unread} ${t("teacherPages", "unread", lang)}` : t("teacherPages", "allCaughtUp", lang)}
      </p>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-2 pb-20">
          <SkeletonList count={5} />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t("teacherPages", "allCaughtUp", lang)}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white mb-20">
          <Table className="min-w-[680px]">
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="w-[55%]">{t("teacherPages", "notifTitle", lang)}</TableHead>
                <TableHead scope="col">{t("teacherPages", "notifFrom", lang)}</TableHead>
                <TableHead scope="col">{t("teacherPages", "notifDate", lang)}</TableHead>
                <TableHead scope="col">{t("teacherPages", "notifStatus", lang)}</TableHead>
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
                        {n.isRead ? t("teacherPages", "notifRead", lang) : t("teacherPages", "unread", lang)}
                      </span>
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
