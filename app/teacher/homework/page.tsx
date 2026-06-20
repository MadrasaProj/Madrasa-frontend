import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  listHomework, createHomework, deleteHomework, updateHomework,
  getSubmissions, bulkUpdateSubmissions,
  type HomeworkAssignment, type HomeworkStatus, type SubmissionsResponse,
} from "@/lib/homework-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, Trash2, CheckCircle2, Clock,
  Loader2, ChevronDown, ChevronUp, AlertTriangle,
  Calendar, Users, Check, X, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "assign" | "check" | "pending";

const STATUS_CONFIG = {
  NOT_SUBMITTED: { label: "Not Submitted", color: "bg-red-100 text-red-700"     },
  SUBMITTED:     { label: "Submitted",     color: "bg-amber-100 text-amber-700" },
  CHECKED:       { label: "Checked",       color: "bg-emerald-100 text-emerald-700" },
};

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

export default function TeacherHomeworkPage() {
  const { user, accessToken } = useAuthStore();
  const cid          = user?.clientId ?? "";
  const token        = accessToken ?? "";
  const teacherId    = user?.id ?? "";
  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";

  const [activeTab, setActiveTab] = useState<Tab>("check");
  const [classes, setClasses]     = useState<ClassRecord[]>([]);
  const [homework, setHomework]   = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedHw, setExpandedHw] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionsResponse>>({});
  const [loadingSubs, setLoadingSubs] = useState<string | null>(null);
  const [savingSubs, setSavingSubs]   = useState(false);
  const [localStatus, setLocalStatus] = useState<Record<string, Record<string, HomeworkStatus>>>({});
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  // New homework form
  const [classId, setClassId]         = useState("");
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState("");
  const [dueDate, setDueDate]         = useState(fmt(new Date(Date.now() + 86400_000)));
  const [subjectId, setSubjectId]     = useState("");
  const [classSubjects, setClassSubjects] = useState<SubjectRecord[]>([]);
  const [creating, setCreating]       = useState(false);

  // Edit homework form
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editTarget, setEditTarget]         = useState<HomeworkAssignment | null>(null);
  const [editTitle, setEditTitle]           = useState("");
  const [editDesc, setEditDesc]             = useState("");
  const [editDueDate, setEditDueDate]       = useState("");
  const [editSubjectId, setEditSubjectId]   = useState("");
  const [updating, setUpdating]             = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load classes + homework
  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    setError(null);
    Promise.all([
      getMyClasses(cid, token, ac.signal),
      listHomework(cid, token),
    ]).then(([cls, hw]) => {
      // Filter to accessible classes:
      // CLASS_BASED: only classes where teacher is classTeacher
      // PERIOD_BASED: classes where teacher has subjects (loaded later per class)
      const accessible = isPeriodBased
        ? cls  // show all; subject filter handles access
        : cls.filter((c) => c.classTeacherId === teacherId);
      setClasses(accessible);
      setHomework(hw);
      if (accessible.length > 0) setClassId(accessible[0].id);
    }).catch((e) => { setError((e as Error).message); }).finally(() => setLoading(false));
    return () => ac.abort();
  }, [cid, token]); // eslint-disable-line

  // Load subjects when classId changes
  useEffect(() => {
    if (!cid || !token || !classId) return;
    setSubjectId("");
    setClassSubjects([]);
    const params = isPeriodBased
      ? { classId, teacherId }   // only teacher's subjects
      : { classId };             // all subjects of teacher's class
    getSubjects(cid, token, params)
      .then((r) => {
        setClassSubjects(r.data);
        if (r.data.length > 0) setSubjectId(r.data[0].id);
      })
      .catch(() => {});
  }, [classId, cid, token]); // eslint-disable-line

  const reload = useCallback(async () => {
    const hw = await listHomework(cid, token).catch((e) => { setError((e as Error).message); return [] as HomeworkAssignment[]; });
    setHomework(hw);
  }, [cid, token]);

  const loadSubmissions = async (hwId: string) => {
    if (submissions[hwId]) { setExpandedHw(expandedHw === hwId ? null : hwId); return; }
    setLoadingSubs(hwId);
    try {
      const data = await getSubmissions(cid, token, hwId);
      setSubmissions((prev) => ({ ...prev, [hwId]: data }));
      setLocalStatus((prev) => ({
        ...prev,
        [hwId]: Object.fromEntries(data.submissions.map((s) => [s.student!.id, s.status])),
      }));
      setExpandedHw(hwId);
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingSubs(null); }
  };

  const saveSubmissions = async (hwId: string) => {
    const statuses = localStatus[hwId];
    if (!statuses) return;
    setSavingSubs(true);
    try {
      await bulkUpdateSubmissions(cid, token, hwId,
        Object.entries(statuses).map(([studentId, status]) => ({ studentId, status })),
      );
      // Refresh submissions
      const data = await getSubmissions(cid, token, hwId);
      setSubmissions((prev) => ({ ...prev, [hwId]: data }));
    } catch (e) { setError((e as Error).message); }
    finally { setSavingSubs(false); }
  };

  const handleCreate = async () => {
    if (!classId || !title || !dueDate || !subjectId) return;
    setCreating(true);
    try {
      await createHomework(cid, token, {
        classId,
        subjectId,
        title,
        description: desc || undefined,
        dueDate,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      setTitle(""); setDesc("");
      await reload();
      setActiveTab("check");
    } catch (e) { setError((e as Error).message); }
    finally { setCreating(false); }
  };

  const openEdit = async (hw: HomeworkAssignment) => {
    setEditTarget(hw);
    setEditTitle(hw.title);
    setEditDesc(hw.description ?? "");
    setEditDueDate(hw.dueDate.split("T")[0]);
    setEditSubjectId(hw.subjectId ?? "");
    if (cid && token && hw.classId) {
      const params = isPeriodBased
        ? { classId: hw.classId, teacherId }
        : { classId: hw.classId };
      getSubjects(cid, token, params)
        .then((r) => {
          setClassSubjects(r.data);
        })
        .catch(() => {});
    }
    setShowEditDrawer(true);
  };

  const handleUpdate = async () => {
    if (!editTarget || !editTitle || !editDueDate || !editSubjectId) return;
    setUpdating(true);
    try {
      await updateHomework(cid, token, editTarget.id, {
        title: editTitle,
        description: editDesc || undefined,
        dueDate: editDueDate,
        subjectId: editSubjectId,
      });
      setShowEditDrawer(false);
      setEditTarget(null);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteHomework(cid, token, id); await reload(); }
    catch (e) { setError((e as Error).message); }
    finally { setDeletingId(null); }
  };

  const today = fmt(new Date());
  const pending = homework.filter((hw) => {
    const due = hw.dueDate.split("T")[0];
    return due <= today;
  });

  return (
    <DashboardLayout>
      <PageHeader title="Homework" icon={BookOpen} back backHref="/teacher" />

      {error && <ApiErrorBanner message={error} onRetry={() => { setError(null); }} />}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-xl">
        {([
          { key: "check",   label: "Assignments",  icon: BookOpen    },
          { key: "assign",  label: "New",          icon: Plus        },
          { key: "pending", label: "Overdue",      icon: AlertTriangle },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === key ? "bg-white shadow-sm text-emerald-700" : "text-gray-500",
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex items-center gap-3 mt-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── NEW ASSIGNMENT ── */}
          {activeTab === "assign" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <p className="font-bold text-gray-800">New Homework Assignment</p>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Class *</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  {classes.length === 0
                    ? <option value="">No accessible classes</option>
                    : classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Subject *
                  {isPeriodBased && <span className="text-gray-400 font-normal ml-1">(your subjects)</span>}
                </label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  {classSubjects.length === 0
                    ? <option value="">
                        {classId
                          ? isPeriodBased ? "No subjects assigned to you in this class" : "No subjects in this class"
                          : "Select a class first"
                        }
                      </option>
                    : classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Surah Al-Baqarah verses 1-5"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description (optional)</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  placeholder="Details, instructions..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Due Date *</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  min={today}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <button
                onClick={handleCreate}
                disabled={!classId || !subjectId || !title || !dueDate || creating}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Assignment
              </button>
            </div>
          )}

          {/* ── ASSIGNMENTS LIST (check submissions) ── */}
          {activeTab === "check" && (
            <div className="space-y-3 pb-20">
              {homework.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  No assignments yet
                </div>
              ) : homework.map((hw) => {
                const due     = new Date(hw.dueDate);
                const isOver  = due < new Date();
                const subResp = submissions[hw.id];
                const total   = subResp?.submissions.length ?? hw._count?.submissions ?? 0;
                const checked = subResp?.submissions.filter((s) => s.status === "CHECKED").length ?? 0;

                return (
                  <div key={hw.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer"
                      onClick={() => loadSubmissions(hw.id)}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        isOver ? "bg-red-50" : "bg-emerald-50",
                      )}>
                        <BookOpen className={cn("w-5 h-5", isOver ? "text-red-500" : "text-emerald-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{hw.title}</p>
                        <p className="text-xs text-gray-400">
                          {hw.class?.name}
                          {hw.subject ? ` · ${hw.subject.name}` : ""}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn("text-xs flex items-center gap-1", isOver ? "text-red-500" : "text-gray-400")}>
                            <Calendar className="w-3 h-3" />
                            {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {isOver ? " (overdue)" : ""}
                          </span>
                          {total > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {checked}/{total} checked
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(hw); }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(hw.id); }}
                          disabled={deletingId === hw.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          {deletingId === hw.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                        {loadingSubs === hw.id
                          ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                          : expandedHw === hw.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Submissions */}
                    <AnimatePresence>
                      {expandedHw === hw.id && subResp && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                        >
                          <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Submissions ({subResp.submissions.length})
                              </p>
                              <button
                                onClick={() => saveSubmissions(hw.id)}
                                disabled={savingSubs}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"
                              >
                                {savingSubs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save
                              </button>
                            </div>
                            <div className="space-y-2">
                              {subResp.submissions.map((sub) => {
                                const curStatus = localStatus[hw.id]?.[sub.student!.id] ?? sub.status;
                                return (
                                  <div key={sub.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{sub.student!.name}</p>
                                      <p className="text-xs text-gray-400">{sub.student!.adno}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      {(["NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as HomeworkStatus[]).map((s) => (
                                        <button
                                          key={s}
                                          onClick={() => setLocalStatus((prev) => ({
                                            ...prev,
                                            [hw.id]: { ...(prev[hw.id] ?? {}), [sub.student!.id]: s },
                                          }))}
                                          className={cn(
                                            "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                            curStatus === s
                                              ? STATUS_CONFIG[s].color
                                              : "bg-gray-100 text-gray-400",
                                          )}
                                        >
                                          {s === "NOT_SUBMITTED" ? "✗" : s === "SUBMITTED" ? "✓" : "✓✓"}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PENDING / OVERDUE ── */}
          {activeTab === "pending" && (
            <div className="space-y-3 pb-20">
              {pending.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-200" />
                  No overdue assignments
                </div>
              ) : pending.map((hw) => {
                const due = new Date(hw.dueDate);
                const daysAgo = Math.floor((Date.now() - due.getTime()) / 86400_000);
                return (
                  <div key={hw.id} className="bg-white rounded-2xl border border-red-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{hw.title}</p>
                        <p className="text-xs text-gray-400">{hw.class?.name}{hw.subject ? ` · ${hw.subject.name}` : ""}</p>
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {due.toLocaleDateString("en-GB")} ({daysAgo === 0 ? "today" : `${daysAgo}d ago`})
                        </p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-1 rounded-lg shrink-0">
                        {hw._count?.submissions ?? 0} students
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Edit Homework Drawer */}
      <AnimatePresence>
        {showEditDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !updating && setShowEditDrawer(false)}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div
                key="edit-hw-drawer"
                initial={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
                transition={isMobile ? { type: "spring", damping: 30, stiffness: 300 } : { duration: 0.2 }}
                className={cn(
                  "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
                  isMobile 
                    ? "rounded-t-3xl max-h-[92dvh]" 
                    : "rounded-3xl max-w-xl max-h-[85dvh]"
                )}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                  <p className="font-bold text-gray-900 text-lg">Edit Assignment</p>
                  <button onClick={() => setShowEditDrawer(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 px-5 py-4 pb-8">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subject *</label>
                  <select value={editSubjectId} onChange={(e) => setEditSubjectId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    {classSubjects.length === 0
                      ? <option value="">No subjects available</option>
                      : classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Surah Al-Baqarah verses 1-5"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description (optional)</label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                    placeholder="Details, instructions..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Due Date *</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                    min={today}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
                <button
                  onClick={() => setShowEditDrawer(false)}
                  className="flex-1 py-3.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!editTitle || !editDueDate || !editSubjectId || updating}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
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
