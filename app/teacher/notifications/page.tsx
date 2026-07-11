import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { motion } from "framer-motion";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT:      { icon: Bell,          color: "text-indigo-700", bg: "bg-indigo-100" },
  ATTENDANCE_ALERT:  { icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-100" },
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

  const handleRead = async (id: string) => {
    await markNotificationRead(cid, token, id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout>
      <PageHeader
        title={t("teacherPages", "notifTitle", lang)}
        subtitle={unread > 0 ? `${unread} ${t("teacherPages", "unread", lang)}` : t("teacherPages", "allCaughtUp", lang)}
        icon={Bell}
      />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-2 pb-20">
          <SkeletonList count={5} />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t("teacherPages", "allCaughtUp", lang)}</div>
      ) : (
        <div className="space-y-2 pb-20">
          {notifs.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("rounded-2xl border p-4 transition-all cursor-pointer active:scale-[0.98]",
                  n.isRead ? "bg-white border-gray-100 hover:border-gray-200" : "bg-blue-50/40 border-blue-100 hover:border-blue-300")}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                      {n.actionUrl && <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                      {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {n.creator ? ` · ${n.creator.name}` : ""}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
