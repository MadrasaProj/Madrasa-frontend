import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { listDiary, upsertDiary, deleteDiary, type DiaryEntry } from "@/lib/diary-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  FileText, Save, CheckCircle2, Loader2, Trash2,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

export default function TeacherDiaryPage() {
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [classes, setClasses]       = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId] = useState("");
  const [date, setDate]             = useState(fmt(new Date()));
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [history, setHistory]       = useState<DiaryEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load classes
  useEffect(() => {
    if (!cid || !token) return;
    getMyClasses(cid, token)
      .then((cls) => {
        setClasses(cls);
        if (cls.length > 0) setActiveClassId(cls[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, [cid, token]);

  // Load history when class changes
  const loadHistory = useCallback(async () => {
    if (!cid || !token || !activeClassId) return;
    setLoadingHistory(true);
    try {
      const entries = await listDiary(cid, token, { classId: activeClassId });
      setHistory(entries);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [cid, token, activeClassId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // When date changes, check for existing entry
  useEffect(() => {
    if (!activeClassId || !history.length) {
      setCurrentEntry(null);
      setTitle(""); setContent("");
      return;
    }
    const existing = history.find((e) => e.date.split("T")[0] === date && e.classId === activeClassId);
    if (existing) {
      setCurrentEntry(existing);
      setTitle(existing.title);
      setContent(existing.content);
    } else {
      setCurrentEntry(null);
      setTitle(""); setContent("");
    }
  }, [date, activeClassId, history]);

  const handleSave = async () => {
    if (!activeClassId || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const entry = await upsertDiary(cid, token, {
        classId: activeClassId,
        date,
        title,
        content,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      setCurrentEntry(entry);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadHistory();
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDiary(cid, token, id);
      if (currentEntry?.id === id) {
        setCurrentEntry(null); setTitle(""); setContent("");
      }
      loadHistory();
    } catch (e) { alert((e as Error).message); }
    finally { setDeletingId(null); }
  };

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(fmt(d)); };
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(fmt(d));
  };

  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <DashboardLayout>
      <PageHeader
        title="Class Diary"
        subtitle={activeClass?.name ?? ""}
        icon={FileText}
        back backHref="/teacher"
      />

      {loadingClasses ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No classes assigned</div>
      ) : (
        <>
          {/* Class selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  activeClassId === cls.id ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700",
                )}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={prevDay} className="p-2 rounded-xl bg-white border border-gray-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <input
                type="date"
                value={date}
                max={fmt(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-semibold text-gray-800 focus:outline-none bg-transparent text-center"
              />
              {currentEntry && (
                <p className="text-[10px] text-emerald-600 mt-0.5">Entry exists — editing</p>
              )}
            </div>
            <button onClick={nextDay} disabled={date >= fmt(new Date())}
              className="p-2 rounded-xl bg-white border border-gray-200 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Entry form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Today's class summary..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Write about today's lesson, student behaviour, topics covered..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                saved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white disabled:opacity-60",
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               saved  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                        <><Save className="w-4 h-4" /> {currentEntry ? "Update Entry" : "Save Entry"}</>}
            </button>
          </div>

          {/* History */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Previous Entries</p>
          {loadingHistory ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No diary entries yet</div>
          ) : (
            <div className="space-y-2 pb-20">
              {history.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={cn(
                    "bg-white rounded-2xl border p-4 cursor-pointer transition-all",
                    date === entry.date.split("T")[0] && activeClassId === entry.classId
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-gray-100",
                  )}
                  onClick={() => setDate(entry.date.split("T")[0])}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{entry.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        {entry.class ? ` · ${entry.class.name}` : ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{entry.content}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                      disabled={deletingId === entry.id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 shrink-0 transition-colors"
                    >
                      {deletingId === entry.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
