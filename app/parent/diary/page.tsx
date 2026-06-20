import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { listDiary, type DiaryEntry } from "@/lib/diary-api";
import { getDiaryEvents, type DiaryEventNotification, type NotificationType } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  FileText, ChevronLeft, ChevronRight, Bell,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
} from "lucide-react";

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function fmtDisplay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT:      { label: "Announcement",   icon: Bell,          color: "text-indigo-700", bg: "bg-indigo-100" },
  ATTENDANCE_ALERT:  { label: "Attendance",      icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-100" },
  FEE_REMINDER:      { label: "Fee Reminder",    icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-100" },
  HOMEWORK_REMINDER: { label: "Homework",        icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-100" },
  EXAM_NOTICE:       { label: "Exam",            icon: GraduationCap, color: "text-indigo-700",  bg: "bg-indigo-100" },
  GENERAL:           { label: "General",         icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100" },
};

export default function ParentDiaryPage() {
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  // Get active student info from accessible students
  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === activeStudentId) ?? students[0];
  const classId = (activeStudent as any)?.classId ?? "";

  const [date, setDate] = useState(fmt(new Date()));
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [events, setEvents] = useState<DiaryEventNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    if (!cid || !token || !classId) return;
    setLoading(true); setError(null);
    try {
      const [diaryData, eventsData] = await Promise.all([
        listDiary(cid, token, { classId, studentId: activeStudent?.id, from: d, to: d }),
        getDiaryEvents(cid, token, { from: d, to: d, classId }),
      ]);
      setEntries(diaryData);
      setEvents(eventsData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, classId, activeStudent]);

  useEffect(() => { load(date); }, [date, load]);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(fmt(d)); };
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(fmt(d));
  };

  const hasContent = entries.length > 0 || events.length > 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Madrasa Diary"
        subtitle={activeStudent ? `${activeStudent.name}` : ""}
        icon={FileText}
        back
        backHref="/parent"
      />

      {error && <ApiErrorBanner message={error} onRetry={() => load(date)} />}

      {/* Date nav */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={prevDay} className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={date}
            max={fmt(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-semibold text-gray-800 focus:outline-none bg-transparent text-center"
          />
          <p className="text-xs text-gray-400 mt-0.5">{fmtDisplay(date)}</p>
        </div>
        <button
          onClick={nextDay}
          disabled={date >= fmt(new Date())}
          className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !hasContent ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No diary entries for this date</p>
        </div>
      ) : (
        <div className="space-y-5 pb-20">
          {/* Class diary entries from teacher */}
          {entries.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Class Diary
              </p>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{entry.title}</p>
                          {entry.class && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 shrink-0">
                              {entry.class.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                        {entry.teacher && (
                          <p className="text-xs text-gray-400 mt-2">— {entry.teacher.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* School announcements / events with this date */}
          {events.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Madrasa Announcements
              </p>
              <div className="space-y-3">
                {events.map((ev) => {
                  const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.GENERAL;
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                          <Icon className={cn("w-4 h-4", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{ev.title}</p>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", cfg.bg, cfg.color)}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{ev.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
