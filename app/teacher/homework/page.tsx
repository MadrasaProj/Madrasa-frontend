import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Drawer } from "@/components/ui/Drawer";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  listHomework, createHomework, deleteHomework, updateHomework,
  getSubmissions, bulkUpdateSubmissions,
  type HomeworkAssignment, type HomeworkStatus, type SubmissionsResponse,
} from "@/lib/homework-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, Trash2,
  Loader2, ChevronRight, AlertTriangle,
  Calendar, Users, Check, X, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";

function useStatusConfig(lang: Lang) {
  return {
    NOT_SUBMITTED: { label: t("teacherPages", "notSubmittedStatus", lang), color: "bg-red-100 text-red-700" },
    SUBMITTED:     { label: t("teacherPages", "submittedStatus", lang),     color: "bg-amber-100 text-amber-700" },
    CHECKED:       { label: t("teacherPages", "checkedStatus", lang),       color: "bg-emerald-100 text-emerald-700" },
  };
}

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

export default function TeacherHomeworkPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const STATUS_CONFIG = useStatusConfig(lang);
  const cid          = user?.clientId ?? "";
  const token        = accessToken ?? "";
  const teacherId    = user?.id ?? "";
  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";

  const [classes, setClasses]         = useState<ClassRecord[]>([]);
  const [homework, setHomework]       = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionsResponse>>({});
  const [loadingSubs, setLoadingSubs] = useState<string | null>(null);
  const [savingSubs, setSavingSubs]   = useState(false);
  const [localStatus, setLocalStatus] = useState<Record<string, Record<string, HomeworkStatus>>>({});
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [classId, setClassId]         = useState("");
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState("");
  const [dueDate, setDueDate]         = useState(fmt(new Date(Date.now() + 86400_000)));
  const [subjectId, setSubjectId]     = useState("");
  const [classSubjects, setClassSubjects] = useState<SubjectRecord[]>([]);
  const [creating, setCreating]       = useState(false);

  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editTarget, setEditTarget]         = useState<HomeworkAssignment | null>(null);
  const [editTitle, setEditTitle]           = useState("");
  const [editDesc, setEditDesc]             = useState("");
  const [editDueDate, setEditDueDate]       = useState("");
  const [editSubjectId, setEditSubjectId]   = useState("");
  const [updating, setUpdating]             = useState(false);

  const [showAssessDrawer, setShowAssessDrawer] = useState(false);
  const [assessHw, setAssessHw]                 = useState<HomeworkAssignment | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    setError(null);
    Promise.all([
      getMyClasses(cid, token, ac.signal),
      listHomework(cid, token),
    ]).then(([cls, hw]) => {
      const accessible = isPeriodBased
        ? cls
        : cls.filter((c) => c.classTeacherId === teacherId);
      setClasses(accessible);
      setHomework(hw);
      if (accessible.length > 0) setClassId(accessible[0].id);
    }).catch((e) => { setError((e as Error).message); }).finally(() => setLoading(false));
    return () => ac.abort();
  }, [cid, token]); // eslint-disable-line

  useEffect(() => {
    if (!cid || !token || !classId) return;
    setSubjectId("");
    setClassSubjects([]);
    const params = isPeriodBased
      ? { classId, teacherId }
      : { classId };
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
    setLoadingSubs(hwId);
    try {
      const data = await getSubmissions(cid, token, hwId);
      setSubmissions((prev) => ({ ...prev, [hwId]: data }));
      setLocalStatus((prev) => ({
        ...prev,
        [hwId]: Object.fromEntries(data.submissions.map((s) => [s.student!.id, s.status])),
      }));
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
      const data = await getSubmissions(cid, token, hwId);
      setSubmissions((prev) => ({ ...prev, [hwId]: data }));
    } catch (e) { setError((e as Error).message); }
    finally { setSavingSubs(false); }
  };

  const openAssess = async (hw: HomeworkAssignment) => {
    setAssessHw(hw);
    setShowAssessDrawer(true);
    if (!submissions[hw.id]) await loadSubmissions(hw.id);
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
      setTitle(""); setDesc(""); setClassId(classes[0]?.id ?? "");
      setShowCreateDrawer(false);
      await reload();
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
        .then((r) => { setClassSubjects(r.data); })
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

  const isOverdue = (hw: HomeworkAssignment) => {
    const due = hw.dueDate.split("T")[0];
    return due < today;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "homeworkTitle", lang)} icon={BookOpen} back backHref="/teacher" />

      {error && <ApiErrorBanner message={error} onRetry={() => { setError(null); }} />}

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {homework.length === 1 ? t("teacherPages", "assignmentsLabel", lang).replace("{n}", String(homework.length)) : t("teacherPages", "assignmentsPlural", lang).replace("{n}", String(homework.length))}
        </p>
        <button
          onClick={() => {
            setTitle(""); setDesc("");
            setDueDate(fmt(new Date(Date.now() + 86400_000)));
            if (classes.length > 0) setClassId(classes[0].id);
            setSubjectId(classSubjects[0]?.id ?? "");
            setShowCreateDrawer(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("teacherPages", "newHwBtn", lang)}</span>
          <span className="sm:hidden">{t("teacherPages", "newBtnShort", lang)}</span>
        </button>
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
      ) : homework.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <p className="text-sm font-medium">{t("teacherPages", "noAssignmentsYet", lang)}</p>
          <p className="text-xs mt-1">{t("teacherPages", "createFirstHw", lang)}</p>
          <button
            onClick={() => setShowCreateDrawer(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t("teacherPages", "newHwBtn", lang)}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-8"></th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("teacherPages", "titleCol", lang)}</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("teacherPages", "classCol", lang)}</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("teacherPages", "subjectCol", lang)}</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("teacherPages", "dueDateCol", lang)}</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("teacherPages", "submissionsCol", lang)}</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-28">{t("teacherPages", "actionsCol", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {homework.map((hw) => {
                  const isOver = isOverdue(hw);
                  const subResp = submissions[hw.id];
                  const total = subResp?.submissions.length ?? hw._count?.submissions ?? 0;
                  const checked = subResp?.submissions.filter((s) => s.status === "CHECKED").length ?? 0;

                  return (
                    <tr
                      key={hw.id}
                      onClick={() => openAssess(hw)}
                      className="border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-4">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          isOver ? "bg-red-500" : "bg-emerald-500",
                        )} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{hw.title}</p>
                        {hw.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{hw.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">{hw.class?.name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-4">
                        {hw.subject ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                            {hw.subject.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "text-sm inline-flex items-center gap-1.5",
                          isOver ? "text-red-600 font-semibold" : "text-gray-600",
                        )}>
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(hw.dueDate)}
                          {isOver && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md leading-none">{t("teacherPages", "overdueBadge", lang)}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {total > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <span className="tabular-nums">{checked}/{total}</span>
                            </div>
                            <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.round((checked / total) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(hw); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(hw.id); }}
                            disabled={deletingId === hw.id}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            {deletingId === hw.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                          <div className="w-px h-5 bg-gray-100 mx-1" />
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 pb-24">
            {homework.map((hw) => {
              const isOver = isOverdue(hw);
              const subResp = submissions[hw.id];
              const total = subResp?.submissions.length ?? hw._count?.submissions ?? 0;
              const checked = subResp?.submissions.filter((s) => s.status === "CHECKED").length ?? 0;

              return (
                <div
                  key={hw.id}
                  onClick={() => openAssess(hw)}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3.5">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                        isOver ? "bg-red-50" : "bg-emerald-50",
                      )}>
                        <BookOpen className={cn("w-5.5 h-5.5", isOver ? "text-red-500" : "text-emerald-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-[15px] leading-snug">{hw.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {hw.class?.name}
                          {hw.subject ? (
                            <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                              {hw.subject.name}
                            </span>
                          ) : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(hw); }}
                          className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Pencil className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(hw.id); }}
                          disabled={deletingId === hw.id}
                          className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {deletingId === hw.id
                            ? <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            : <Trash2 className="w-4.5 h-4.5" />}
                        </button>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3.5">
                      <span className={cn(
                        "text-sm flex items-center gap-1.5",
                        isOver ? "text-red-600 font-semibold" : "text-gray-500",
                      )}>
                        <Calendar className="w-4 h-4 shrink-0" />
                        {formatDate(hw.dueDate)}
                      </span>
                      {total > 0 && (
                        <span className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Users className="w-4 h-4 shrink-0" />
                          {checked}/{total} {t("teacherPages", "checkedLabel", lang)}
                        </span>
                      )}
                      {isOver && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t("teacherPages", "overdueLabel", lang)}
                        </span>
                      )}
                    </div>

                    {total > 0 && (
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.round((checked / total) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Homework Drawer */}
      <Drawer
        open={showCreateDrawer}
        onOpenChange={setShowCreateDrawer}
        title={t("teacherPages", "newHomeworkTitle", lang)}
        description={t("teacherPages", "newHomeworkDesc", lang)}
      >
        <div className="space-y-4 p-5 pb-8">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "classRequired", lang)}</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              {classes.length === 0
                ? <option value="">{t("teacherPages", "noAccessibleClasses", lang)}</option>
                : classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
              }
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              {t("teacherPages", "subjectRequired", lang)}
              {isPeriodBased && <span className="text-gray-400 font-normal ml-1">{t("teacherPages", "yourSubjectsHint", lang)}</span>}
            </label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              {classSubjects.length === 0
                ? <option value="">
                    {classId
                      ? isPeriodBased ? t("teacherPages", "noSubjectsAssigned", lang) : t("teacherPages", "noSubjectsInClass", lang)
                      : t("teacherPages", "selectClassFirst", lang)
                    }
                  </option>
                : classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
              }
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "titleRequired", lang)}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t("teacherPages", "titlePlaceholder", lang)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "descOptional", lang)}</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              placeholder={t("teacherPages", "descPlaceholder", lang)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "dueDateRequired", lang)}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <button
            onClick={handleCreate}
            disabled={!classId || !subjectId || !title || !dueDate || creating}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors active:scale-[0.98]"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("teacherPages", "createAssignmentBtn", lang)}
          </button>
        </div>
      </Drawer>

      {/* Assess Homework Drawer */}
      <Drawer
        open={showAssessDrawer}
        onOpenChange={(open) => { if (!open) { setShowAssessDrawer(false); setAssessHw(null); } }}
        title={assessHw?.title ?? t("teacherPages", "assessHomeworkTitle", lang)}
        description={
          assessHw
            ? `${assessHw.class?.name ?? ""}${assessHw.subject ? ` · ${assessHw.subject.name}` : ""} — Due ${formatDate(assessHw.dueDate)}`
            : ""
        }
      >
        {assessHw && loadingSubs === assessHw.id && !submissions[assessHw.id] ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : assessHw && submissions[assessHw.id] ? (
          <div className="p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {t("teacherPages", "submissionsCount", lang).replace("{n}", String(submissions[assessHw.id].submissions.length))}
              </p>
              <button
                onClick={() => saveSubmissions(assessHw.id)}
                disabled={savingSubs}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {savingSubs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {t("common", "save", lang)}
              </button>
            </div>
            <div className="space-y-2">
              {submissions[assessHw.id].submissions.map((sub) => {
                const curStatus = localStatus[assessHw.id]?.[sub.student!.id] ?? sub.status;
                return (
                  <div key={sub.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100">
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
                            [assessHw.id]: { ...(prev[assessHw.id] ?? {}), [sub.student!.id]: s },
                          }))}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                            curStatus === s
                              ? STATUS_CONFIG[s].color + " ring-1 ring-inset ring-current/20"
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100",
                          )}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Drawer>

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
                  <p className="font-bold text-gray-900 text-lg">{t("teacherPages", "editAssignmentTitle", lang)}</p>
                  <button onClick={() => setShowEditDrawer(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 px-5 py-4 pb-8">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "subjectRequired", lang)}</label>
                    <select value={editSubjectId} onChange={(e) => setEditSubjectId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      {classSubjects.length === 0
                        ? <option value="">{t("teacherPages", "noSubjectsAvail", lang)}</option>
                        : classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                      }
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "titleRequired", lang)}</label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={t("teacherPages", "titlePlaceholder", lang)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "descOptional", lang)}</label>
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                      placeholder={t("teacherPages", "descPlaceholder", lang)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("teacherPages", "dueDateRequired", lang)}</label>
                    <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                      min={today}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
                  <button
                    onClick={() => setShowEditDrawer(false)}
                    className="flex-1 py-3.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    {t("common", "cancel", lang)}
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={!editTitle || !editDueDate || !editSubjectId || updating}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t("teacherPages", "saveChangesBtn", lang)}
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
