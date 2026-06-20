import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getNotifications, markNotificationRead,
  type NotificationRecord,
} from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Bell, BookOpen, ClipboardList, GraduationCap, CreditCard,
  FileText, Loader2, RefreshCw, CheckCheck, ExternalLink,
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

export default function ParentNotificationsPage() {
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const navigate = useNavigate();

  const [notifs, setNotifs]   = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(cid, token, { take: 60 });
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

  const markAllRead = async () => {
    const unread = notifs.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markNotificationRead(cid, token, n.id).catch(() => {})));
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "All caught up"}
        icon={Bell}
        action={
          <div className="flex gap-2">
            {unread > 0 && (
              <button onClick={markAllRead} className="p-2 rounded-xl bg-gray-100 text-gray-600" title="Mark all read">
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button onClick={load} className="p-2 rounded-xl bg-gray-100 text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2 pb-20">
          {notifs.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-2xl border p-4 cursor-pointer transition-all active:scale-[0.98]",
                  n.isRead ? "bg-white border-gray-100 hover:border-gray-200" : "bg-blue-50/40 border-blue-200 hover:border-blue-300",
                )}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                    <Icon className={cn("w-5 h-5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("font-semibold text-sm", n.isRead ? "text-gray-700" : "text-gray-900")}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {n.actionUrl && <ExternalLink className="w-3.5 h-3.5 text-blue-500" />}
                        {!n.isRead && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                        <span className="text-[10px] text-gray-400">
                          {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{n.body}</p>
                    {n.creator && (
                      <p className="text-[10px] text-gray-400 mt-1">From: {n.creator.name}</p>
                    )}
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
