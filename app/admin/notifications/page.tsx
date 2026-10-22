import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getSentNotifications, createNotification, deleteNotification, updateNotification,
  type NotificationRecord, type NotificationType,
} from "@/lib/notifications-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Bell, Plus, Send, Trash2, Loader2, X, Pencil, ExternalLink,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonList } from "@/components/ui/Skeleton";

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT:       { label: "Announcement",    icon: Bell,          color: "text-indigo-700", bg: "bg-indigo-100" },
  ATTENDANCE_ALERT:   { label: "Attendance",       icon: ClipboardList, color: "text-primary-700", bg: "bg-primary-100" },
  FEE_REMINDER:       { label: "Fee Reminder",     icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-100" },
  HOMEWORK_REMINDER:  { label: "Homework",         icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-100" },
  EXAM_NOTICE:        { label: "Exam Notice",      icon: GraduationCap, color: "text-indigo-700",  bg: "bg-indigo-100" },
  GENERAL:            { label: "General",          icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100" },
};

const ROLES = ["CLIENT_ADMIN", "TEACHER", "PARENT"];

export default function AdminNotificationsPage() {
  const { accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [sent, setSent]           = useState<NotificationRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [classes, setClasses]     = useState<ClassRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [editTarget, setEditTarget]   = useState<NotificationRecord | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Compose form
  const [cTitle, setCTitle]       = useState("");
  const [cBody, setCBody]         = useState("");
  const [cType, setCType]         = useState<NotificationType>("ANNOUNCEMENT");
  const [cRoles, setCRoles]       = useState<string[]>(["PARENT"]);
  const [cClassIds, setCClassIds] = useState<string[]>([]);
  const [cEventDate, setCEventDate] = useState("");
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");

  const handleComposeClick = () => {
    setEditTarget(null);
    setCTitle(""); setCBody(""); setCType("ANNOUNCEMENT"); setCRoles(["PARENT"]); setCClassIds([]); setCEventDate("");
    setSendError("");
    setShowCompose(true);
  };

  const handleEditClick = (n: NotificationRecord) => {
    setEditTarget(n);
    setCTitle(n.title);
    setCBody(n.body);
    setCType(n.type);
    setCRoles(n.targetRoles);
    setCClassIds(n.targetClassIds);
    setCEventDate(n.eventDate ? n.eventDate.split("T")[0] : "");
    setSendError("");
    setShowCompose(true);
  };

  const loadSent = useCallback(async () => {
    if (!cid || !token) return;
    setError(null); setLoading(true);
    try {
      const data = await getSentNotifications(cid, token, { take: 50 });
      setSent(data.notifications ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [cid, token]);

  useEffect(() => {
    if (!cid || !token) return;
    loadSent();
    getAllClasses(cid, token).then(setClasses).catch((e) => { setError((e as Error).message); });
  }, [cid, token, loadSent]);

  const handleSend = async () => {
    if (!cTitle || !cBody || !cRoles.length) return;
    setSendError(""); setSending(true);
    try {
      if (editTarget) {
        await updateNotification(cid, token, editTarget.id, {
          title: cTitle, body: cBody, type: cType,
          targetRoles: cRoles,
          targetClassIds: cClassIds.length ? cClassIds : undefined,
          eventDate: cEventDate || undefined,
        });
      } else {
        await createNotification(cid, token, {
          title: cTitle, body: cBody, type: cType,
          targetRoles: cRoles,
          targetClassIds: cClassIds.length ? cClassIds : undefined,
          eventDate: cEventDate || undefined,
        });
      }
      setShowCompose(false);
      setEditTarget(null);
      setCTitle(""); setCBody(""); setCRoles(["PARENT"]); setCClassIds([]); setCEventDate("");
      loadSent();
    } catch (e) { setSendError((e as Error).message); }
    finally { setSending(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteNotification(cid, token, id); loadSent(); }
    catch (e) { alert((e as Error).message); }
    finally { setDeletingId(null); }
  };

  const toggleRole = (r: string) =>
    setCRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  return (
    <DashboardLayout>
      <PageHeader title="Notifications" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{total} sent</p>
        <button onClick={handleComposeClick}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold">
          <Plus className="w-4 h-4" /> Compose
        </button>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={loadSent} />}

      {loading ? (
        <SkeletonList count={4} />
      ) : sent.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No notifications sent yet</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white mb-20">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="w-[40%]">Notification</TableHead>
                <TableHead scope="col">Type</TableHead>
                <TableHead scope="col">Audience</TableHead>
                <TableHead scope="col">Sent / reads</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sent.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
                const Icon = cfg.icon;
                return (
                  <TableRow key={n.id}>
                    <TableCell className="whitespace-normal">
                      <p className="font-semibold text-gray-900">{n.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                      {n.actionUrl && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-blue-600 break-all">
                          <ExternalLink className="h-3 w-3 shrink-0" />{n.actionUrl}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold", cfg.bg, cfg.color)}>
                        <Icon className="h-3.5 w-3.5" />{cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs text-gray-600">{n.targetRoles.join(", ")}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(n.createdAt).toLocaleDateString("en-GB")}
                      {n._count && <p className="mt-1">{n._count.reads} read</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEditClick(n)} aria-label={`Edit ${n.title}`}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(n.id)} disabled={deletingId === n.id}
                          aria-label={`Delete ${n.title}`}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          {deletingId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Compose modal */}
      <AnimatePresence>
        {showCompose && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowCompose(false)} />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div
                initial={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
                transition={isMobile ? { type: "spring", damping: 30, stiffness: 300 } : { duration: 0.2 }}
                className={cn(
                  "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
                  isMobile 
                    ? "rounded-t-3xl max-h-[90dvh]" 
                    : "rounded-3xl max-w-xl max-h-[85dvh]"
                )}
              >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <p className="font-bold text-gray-900 text-lg">{editTarget ? "Edit Notification" : "Compose Notification"}</p>
                  <button onClick={() => setShowCompose(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {sendError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{sendError}</div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
                  <input value={cTitle} onChange={(e) => setCTitle(e.target.value)}
                    placeholder="Notification title"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Message *</label>
                  <textarea value={cBody} onChange={(e) => setCBody(e.target.value)} rows={3}
                    placeholder="Write your message..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                  <select value={cType} onChange={(e) => setCType(e.target.value as NotificationType)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Target Roles</label>
                  <div className="flex gap-2 flex-wrap">
                    {ROLES.map((r) => (
                      <button key={r} onClick={() => toggleRole(r)}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          cRoles.includes(r) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200")}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {classes.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">
                      Target Classes <span className="text-gray-400 font-normal">(empty = all)</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {classes.map((c) => (
                        <button key={c.id} onClick={() =>
                          setCClassIds((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])
                        }
                          className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                            cClassIds.includes(c.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Event Date <span className="text-gray-400 font-normal">(optional — shows in diary)</span>
                  </label>
                  <input type="date" value={cEventDate} onChange={(e) => setCEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
                <button onClick={() => setShowCompose(false)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all">Cancel</button>
                <button onClick={handleSend} disabled={!cTitle || !cBody || !cRoles.length || sending}
                  className="flex-1 py-3.5 bg-primary-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </motion.div>
          </div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
