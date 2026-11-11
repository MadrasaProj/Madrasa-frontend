import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DrawerSelector } from "@/components/DrawerSelector";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getSentNotifications, createNotification, deleteNotification, updateNotification,
  type NotificationRecord, type NotificationType,
} from "@/lib/notifications-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Bell, Plus, Send, Trash2, Loader2, Pencil, ExternalLink, CalendarDays,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

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

  const [eventDateOpen, setEventDateOpen] = useState(false);

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
        toast.success("Notification updated successfully");
      } else {
        await createNotification(cid, token, {
          title: cTitle, body: cBody, type: cType,
          targetRoles: cRoles,
          targetClassIds: cClassIds.length ? cClassIds : undefined,
          eventDate: cEventDate || undefined,
        });
        toast.success("Notification sent successfully");
      }
      setShowCompose(false);
      setEditTarget(null);
      setCTitle(""); setCBody(""); setCRoles(["PARENT"]); setCClassIds([]); setCEventDate("");
      loadSent();
    } catch (e) {
      setSendError((e as Error).message);
      toast.error((e as Error).message || "Failed to send notification");
    }
    finally { setSending(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteNotification(cid, token, id);
      toast.success("Notification deleted successfully");
      loadSent();
    }
    catch (e) {
      toast.error((e as Error).message || "Failed to delete notification");
    }
    finally { setDeletingId(null); }
  };

  const toggleRole = (r: string) =>
    setCRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  return (
    <DashboardLayout>
      <PageHeader title="Notifications" />

      <div className="mx-3 mb-4 mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500"><span className="font-semibold tabular-nums text-gray-900">{total}</span> sent</p>
        <Button type="button" size="sm" onClick={handleComposeClick}>
          <Plus className="size-4" /> Compose
        </Button>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={loadSent} />}

      {loading ? (
        <div className="mx-3 overflow-hidden rounded-2xl bg-white divide-y divide-gray-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="size-10 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : sent.length === 0 ? (
        <div className="mx-3 rounded-2xl border border-gray-100 bg-white px-4 py-16 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-primary-200" />
          <p className="text-base font-bold text-gray-800">No notifications sent yet</p>
          <p className="text-xs text-gray-500 mt-1 mb-5">Broadcast announcements, fee reminders, and alerts to parents and teachers.</p>
          <Button type="button" onClick={handleComposeClick}>
            <Plus className="w-4 h-4" /> Create Notification
          </Button>
        </div>
      ) : (
        <div className="mx-3 mb-20 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              {sent.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
                const Icon = cfg.icon;
                return (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-4">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                      <Icon className={cn("size-4", cfg.color)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{n.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                        <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{n.targetRoles.join(", ")}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{new Date(n.createdAt).toLocaleDateString("en-GB")}</span>
                        {n._count && <span>· {n._count.reads} read</span>}
                      </div>
                      {n.actionUrl && <p className="mt-1 flex items-center gap-1 break-all text-xs text-blue-600"><ExternalLink className="size-3 shrink-0" />{n.actionUrl}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleEditClick(n)} aria-label={`Edit ${n.title}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDelete(n.id)} disabled={deletingId === n.id} aria-label={`Delete ${n.title}`} className="text-red-600 hover:bg-red-50">
                        {deletingId === n.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      <ResponsivePopover
        open={showCompose}
        onOpenChange={setShowCompose}
        title={editTarget ? "Edit Notification" : "Compose Notification"}
        desktopView="right-drawer"
        className="shadow-none"
        footer={
          <div className="flex gap-3 border-t border-gray-100 p-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button type="button" className="flex-1" onClick={handleSend} disabled={!cTitle.trim() || !cBody.trim() || !cRoles.length || sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {editTarget ? "Save" : "Send"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 px-5 pb-6 pt-2">
          {sendError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{sendError}</p>}
          <div className="space-y-1.5">
            <label htmlFor="notification-title" className="text-xs font-semibold text-gray-600">Title *</label>
            <Input id="notification-title" size="lg" value={cTitle} onChange={(event) => setCTitle(event.target.value)} placeholder="Notification title" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="notification-message" className="text-xs font-semibold text-gray-600">Message *</label>
            <Textarea id="notification-message" size="lg" value={cBody} onChange={(event) => setCBody(event.target.value)} rows={4} placeholder="Write your message..." />
          </div>
          <DrawerSelector
            title="Notification type"
            options={Object.entries(TYPE_CONFIG).map(([value, config]) => ({ value, label: config.label }))}
            value={cType}
            onChange={(value) => setCType(value as NotificationType)}
          />
          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-semibold text-gray-600">Target roles *</legend>
            {ROLES.map((role) => (
              <label key={role} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 text-sm text-gray-700">
                <Checkbox checked={cRoles.includes(role)} onCheckedChange={() => toggleRole(role)} aria-label={role} />
                {role === "CLIENT_ADMIN" ? "Admin" : role === "TEACHER" ? "Teacher" : "Parent"}
              </label>
            ))}
          </fieldset>
          {classes.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-gray-600">Target classes <span className="font-normal text-gray-400">(none selected = all)</span></legend>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
                {classes.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Checkbox checked={cClassIds.includes(cls.id)} onCheckedChange={() => setCClassIds((previous) => previous.includes(cls.id) ? previous.filter((id) => id !== cls.id) : [...previous, cls.id])} aria-label={cls.name} />
                    {cls.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">Event date <span className="font-normal text-gray-400">(optional, shows in diary)</span></span>
            <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setEventDateOpen(true)}>
              {cEventDate || "Select date"}<CalendarDays className="size-4 text-gray-500" />
            </Button>
          </div>
        </div>
      </ResponsivePopover>
      <DatePickerDrawer
        open={eventDateOpen}
        onOpenChange={setEventDateOpen}
        date={cEventDate}
        onDateChange={setCEventDate}
        title="Event date"
        disableFuture={false}
        allowClear
      />
    </DashboardLayout>
  );
}
