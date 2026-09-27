import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HomeworkAssignmentDrawer } from "@/components/teacher/HomeworkAssignmentDrawer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
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
  Plus, Trash2, Loader2, Check, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

function useStatusConfig(lang: Lang) {
  return {
    NOT_SUBMITTED: { label: t("teacherPages", "notSubmittedStatus", lang) },
    SUBMITTED:     { label: t("teacherPages", "submittedStatus", lang) },
    CHECKED:       { label: t("teacherPages", "checkedStatus", lang) },
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
  const [deleteTarget, setDeleteTarget] = useState<HomeworkAssignment | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const [showHomeworkDrawer, setShowHomeworkDrawer] = useState(false);
  const [classId, setClassId]         = useState("");
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState("");
  const [dueDate, setDueDate]         = useState(fmt(new Date(Date.now() + 86400_000)));
  const [subjectId, setSubjectId]     = useState("");
  const [classSubjects, setClassSubjects] = useState<SubjectRecord[]>([]);
  const [creating, setCreating]       = useState(false);

  const [editTarget, setEditTarget]         = useState<HomeworkAssignment | null>(null);
  const [updating, setUpdating]             = useState(false);

  const [showAssessDrawer, setShowAssessDrawer] = useState(false);
  const [assessHw, setAssessHw]                 = useState<HomeworkAssignment | null>(null);

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

  const openCreate = () => {
    setEditTarget(null);
    setTitle("");
    setDesc("");
    setDueDate(fmt(new Date(Date.now() + 86400_000)));
    if (classes.length > 0) setClassId(classes[0].id);
    setSubjectId(classSubjects[0]?.id ?? "");
    setShowHomeworkDrawer(true);
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
      setShowHomeworkDrawer(false);
      await reload();
    } catch (e) { setError((e as Error).message); }
    finally { setCreating(false); }
  };

  const openEdit = async (hw: HomeworkAssignment) => {
    setEditTarget(hw);
    setTitle(hw.title);
    setDesc(hw.description ?? "");
    setDueDate(hw.dueDate.split("T")[0]);
    setSubjectId(hw.subjectId ?? "");
    if (cid && token && hw.classId) {
      const params = isPeriodBased
        ? { classId: hw.classId, teacherId }
        : { classId: hw.classId };
      getSubjects(cid, token, params)
        .then((r) => { setClassSubjects(r.data); })
        .catch(() => {});
    }
    setShowHomeworkDrawer(true);
  };

  const handleUpdate = async () => {
    if (!editTarget || !title || !dueDate || !subjectId) return;
    setUpdating(true);
    try {
      await updateHomework(cid, token, editTarget.id, {
        title,
        description: desc || undefined,
        dueDate,
        subjectId,
      });
      setShowHomeworkDrawer(false);
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
    try {
      await deleteHomework(cid, token, id);
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
    finally { setDeletingId(null); }
  };

  const today = fmt(new Date());

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t("teacherPages", "homeworkTitle", lang)}
        action={(
          <Button size="lg" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("teacherPages", "newHwBtn", lang)}
          </Button>
        )}
      />

      {error && <ApiErrorBanner message={error} onRetry={() => { setError(null); }} />}

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
        <div className="-mx-4 flex min-h-[calc(100dvh-11rem)] w-[calc(100%+2rem)] items-center justify-center px-6 py-8 text-center lg:-mx-8 lg:w-[calc(100%+4rem)]">
          <div className="w-full max-w-sm">
            <img src="/imgs/homework/1.png" alt="" className="mx-auto mb-4 h-auto w-56 max-w-full object-contain" />
            <h3 className="mt-3 text-base font-bold text-gray-900">
              {t("teacherPages", "noAssignmentsYet", lang)}
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              {t("teacherPages", "createFirstHw", lang)}
            </p>
            <div className="mt-5">
              <Button onClick={openCreate} size="lg">
                <Plus className="w-4 h-4" />
                {t("teacherPages", "newHwBtn", lang)}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 pb-24">
          {homework.map((hw) => {
            return (
              <div key={hw.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openAssess(hw)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-gray-900">{hw.title}</p>
                    <p className="mt-1 truncate text-sm text-gray-500">
                      {hw.class?.name ?? "—"} <span className="mx-1 text-gray-300">·</span> {hw.subject?.name ?? "—"}
                    </p>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <HomeworkAssignmentDrawer
        open={showHomeworkDrawer}
        onOpenChange={setShowHomeworkDrawer}
        mode={editTarget ? "edit" : "create"}
        lang={lang}
        isPeriodBased={isPeriodBased}
        classes={classes}
        classSubjects={classSubjects}
        classId={classId}
        onClassChange={setClassId}
        subjectId={subjectId}
        onSubjectChange={setSubjectId}
        title={title}
        onTitleChange={setTitle}
        description={desc}
        onDescriptionChange={setDesc}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        today={today}
        busy={editTarget ? updating : creating}
        onSubmit={editTarget ? handleUpdate : handleCreate}
      />

      {/* Assess Homework Drawer */}
      <ResponsivePopover
        open={showAssessDrawer}
        contentClassName="max-h-[calc(100dvh-15rem)] flex flex-col overflow-hidden"
        onOpenChange={(open) => { if (!open) { setShowAssessDrawer(false); setAssessHw(null); setDeleteTarget(null); } }}
        title={assessHw?.title ?? t("teacherPages", "assessHomeworkTitle", lang)}
        description={
          assessHw
            ? `${assessHw.class?.name ?? ""}${assessHw.subject ? ` · ${assessHw.subject.name}` : ""} — Due ${formatDate(assessHw.dueDate)}`
            : ""
        }
      >
        {assessHw && (
          <div className="flex h-[calc(100dvh-15rem)] max-h-[calc(100dvh-15rem)] flex-col">
            <div className="shrink-0 px-5 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {t("teacherPages", "submissionsCount", lang).replace("{n}", String(submissions[assessHw.id]?.submissions.length ?? 0))}
              </p>
            </div>
            </div>
            {loadingSubs === assessHw.id && !submissions[assessHw.id] ? (
              <div className="flex min-h-0 flex-1 items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
              </div>
            ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {(submissions[assessHw.id]?.submissions ?? []).map((sub) => {
                const curStatus = localStatus[assessHw.id]?.[sub.student!.id] ?? sub.status;
                return (
                  <div key={sub.id} className="flex items-center gap-3 border-b border-gray-100 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{sub.student!.name}</p>
                      <p className="text-xs text-gray-400">{sub.student!.adno}</p>
                    </div>
                    <ButtonGroup className="shrink-0">
                      {(["NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as HomeworkStatus[]).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={curStatus === s ? "default" : "outline"}
                          onClick={() => setLocalStatus((prev) => ({
                            ...prev,
                            [assessHw.id]: { ...(prev[assessHw.id] ?? {}), [sub.student!.id]: s },
                          }))}
                        >
                          {STATUS_CONFIG[s].label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </div>
                );
              })}
            </div>
            )}
            <div className="shrink-0 border-t border-gray-100 bg-white p-5">
            <ButtonGroup className="w-full">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  const homeworkToEdit = assessHw;
                  setShowAssessDrawer(false);
                  setAssessHw(null);
                  setDeleteTarget(null);
                  void openEdit(homeworkToEdit);
                }}
              >
                <Pencil />
                {t("common", "edit", lang)}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="flex-1"
                onClick={() => setDeleteTarget(assessHw)}
                disabled={deletingId === assessHw.id}
              >
                <Trash2 />
                {t("common", "delete", lang)}
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => saveSubmissions(assessHw.id)}
                disabled={savingSubs || !submissions[assessHw.id]}
              >
                {savingSubs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("common", "save", lang)}
              </Button>
            </ButtonGroup>
            </div>
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && deletingId === null) setDeleteTarget(null); }}
        side="bottom"
        title={t("teacherPages", "deleteHomeworkTitle", lang)}
        description={t("teacherPages", "deleteHomeworkConfirm", lang).replace("{name}", deleteTarget?.title ?? "")}
      >
        <div className="flex justify-end gap-2 p-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletingId !== null}>
            {t("common", "cancel", lang)}
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!deleteTarget) return;
              const deleted = await handleDelete(deleteTarget.id);
              if (deleted) {
                setDeleteTarget(null);
                setShowAssessDrawer(false);
                setAssessHw(null);
              }
            }}
            disabled={!deleteTarget || deletingId !== null}
          >
            {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("common", "delete", lang)}
          </Button>
        </div>
      </ResponsivePopover>

    </DashboardLayout>
  );
}
