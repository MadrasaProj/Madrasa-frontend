import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getNotifications, createNotification, markNotificationRead,
  type NotificationRecord, type NotificationType,
} from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Bell, Plus, Send, Loader2, X,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT:      { icon: Bell,          color: "text-purple-700", bg: "bg-purple-100" },
  ATTENDANCE_ALERT:  { icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-100" },
  FEE_REMINDER:      { icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-100" },
  HOMEWORK_REMINDER: { icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-100" },
  EXAM_NOTICE:       { icon: GraduationCap, color: "text-indigo-700",  bg: "bg-indigo-100" },
  GENERAL:           { icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100" },
};

export default function TeacherNotificationsPage() {
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [notifs, setNotifs]       = useState<NotificationRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [cTitle, setCTitle]       = useState("");
  const [cBody, setCBody]         = useState("");
  const [sending, setSending]     = useState(false);

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

  const handleRead = async (id: string) => {
    await markNotificationRead(cid, token, id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleSend = async () => {
    if (!cTitle || !cBody) return;
    setSending(true);
    try {
      await createNotification(cid, token, {
        title: cTitle, body: cBody,
        type: "GENERAL",
        targetRoles: ["PARENT"],
      });
      setShowCompose(false); setCTitle(""); setCBody("");
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setSending(false); }
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "All read"}
        icon={Bell}
        action={
          <button onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> Send
          </button>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No notifications</div>
      ) : (
        <div className="space-y-2 pb-20">
          {notifs.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("rounded-2xl border p-4 transition-all", n.isRead ? "bg-white border-gray-100" : "bg-blue-50/40 border-blue-100")}
                onClick={() => !n.isRead && handleRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
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

      {/* Quick compose */}
      <AnimatePresence>
        {showCompose && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowCompose(false)} />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-900">Send to Parents</p>
                <button onClick={() => setShowCompose(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Subject"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <textarea value={cBody} onChange={(e) => setCBody(e.target.value)} rows={3} placeholder="Message..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                <button onClick={handleSend} disabled={!cTitle || !cBody || sending}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send to Parents
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
