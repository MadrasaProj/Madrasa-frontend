import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { listDiary, addDiaryComment, type DiaryEntry } from "@/lib/diary-api";
import { getDiaryEvents, type DiaryEventNotification, type NotificationType } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  FileText, ChevronLeft, ChevronRight, Bell, Send, Loader2,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
} from "lucide-react";

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function fmtDisplay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string; bg: string; dot: string; border: string }> = {
  ANNOUNCEMENT:      { label: "Announcement",   icon: Bell,          color: "text-indigo-700", bg: "bg-indigo-100", dot: "bg-indigo-400", border: "border-indigo-300" },
  ATTENDANCE_ALERT:  { label: "Attendance",      icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-400", border: "border-emerald-300" },
  FEE_REMINDER:      { label: "Fee Reminder",    icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-100", dot: "bg-amber-400", border: "border-amber-300" },
  HOMEWORK_REMINDER: { label: "Homework",        icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-100", dot: "bg-blue-400", border: "border-blue-300" },
  EXAM_NOTICE:       { label: "Exam",            icon: GraduationCap, color: "text-indigo-700",  bg: "bg-indigo-100", dot: "bg-indigo-400", border: "border-indigo-300" },
  GENERAL:           { label: "General",         icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100", dot: "bg-gray-400", border: "border-gray-300" },
};

const PAGE_SIZE = 10;

export default function ParentDiaryPage() {
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === activeStudentId) ?? students[0];
  const classId = (activeStudent as any)?.classId ?? "";

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [events, setEvents] = useState<DiaryEventNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!cid || !token || !classId) return;
    setLoading(true); setError(null);
    try {
      const [diaryData, eventsData] = await Promise.all([
        listDiary(cid, token, { classId, studentId: activeStudent?.id }),
        getDiaryEvents(cid, token, { classId, from: "2020-01-01", to: fmt(new Date()) }),
      ]);
      setEntries(diaryData);
      setEvents(eventsData);
      setPage(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, classId, activeStudent?.id]);

  useEffect(() => { load(); }, [load]);

  const timeline = useMemo(() => {
    const items: { type: "entry" | "event"; date: string; data: DiaryEntry | DiaryEventNotification }[] = [
      ...entries.map((e) => ({ type: "entry" as const, date: e.date.slice(0, 10), data: e })),
      ...events.filter((e) => e.eventDate).map((e) => ({ type: "event" as const, date: e.eventDate!.slice(0, 10), data: e })),
    ];
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [entries, events]);

  const totalPages = Math.max(1, Math.ceil(timeline.length / PAGE_SIZE));
  const paginated = timeline.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReply = async (entryId: string) => {
    const text = replyText[entryId]?.trim();
    if (!text || !activeStudent?.id) return;
    setSendingReply((prev) => ({ ...prev, [entryId]: true }));
    try {
      await addDiaryComment(cid, token, entryId, {
        content: text,
        studentId: activeStudent.id,
        parentName: user?.name,
      });
      setReplyText((prev) => ({ ...prev, [entryId]: "" }));
      load();
    } catch { /* ignore */ }
    finally { setSendingReply((prev) => ({ ...prev, [entryId]: false })); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Madrasa Diary"
        subtitle={activeStudent ? `${activeStudent.name}` : ""}
        icon={FileText}
        back
        backHref="/parent"
      />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No diary entries found</p>
        </div>
      ) : (
        <div className="pb-20">
          <div className="relative pl-7">
            <div className="absolute left-[8px] inset-y-0 w-px bg-gray-200" />

            {paginated.map((item, idx) => {
              const dateLabel = fmtDisplay(item.date);

              if (item.type === "entry") {
                const entry = item.data as DiaryEntry;
                return (
                  <div key={entry.id} className="relative pb-6">
                    <div className="absolute -left-[23px] top-1.5 w-[7px] h-[7px] rounded-full bg-emerald-400 ring-2 ring-white" />
                    <p className="text-[11px] font-semibold text-gray-400 mb-1.5">{dateLabel}</p>
                    <div className="border-l-2 border-emerald-200 pl-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{entry.title}</p>
                        {entry.class && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 shrink-0">
                            {entry.class.name}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed [&_ul]:pl-5 [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg" dangerouslySetInnerHTML={{ __html: entry.content }} />
                      {entry.teacher && (
                        <p className="text-xs text-gray-400 mt-1">— {entry.teacher.name}</p>
                      )}

                      {/* Comments */}
                      {entry.comments && entry.comments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {entry.comments.map((c) => (
                            <div key={c.id} className="bg-gray-50 rounded-xl p-2.5">
                              <p className="text-xs text-gray-500 mb-0.5">
                                {c.parentName ?? "Parent"}
                              </p>
                              <p className="text-sm text-gray-700">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      <div className="mt-3 flex gap-2">
                        <input
                          value={replyText[entry.id] ?? ""}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                          placeholder="Write a response..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={() => handleReply(entry.id)}
                          disabled={sendingReply[entry.id] || !replyText[entry.id]?.trim()}
                          className="p-2 rounded-xl bg-emerald-600 text-white disabled:opacity-40"
                        >
                          {sendingReply[entry.id]
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const ev = item.data as DiaryEventNotification;
              const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.GENERAL;
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="relative pb-6">
                  <div className={cn("absolute -left-[23px] top-1.5 w-[7px] h-[7px] rounded-full ring-2 ring-white", cfg.dot)} />
                  <p className="text-[11px] font-semibold text-gray-400 mb-1.5">{dateLabel}</p>
                  <div className={cn("border-l-2 pl-3", cfg.border)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{ev.title}</p>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{ev.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm text-gray-500 font-medium">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
