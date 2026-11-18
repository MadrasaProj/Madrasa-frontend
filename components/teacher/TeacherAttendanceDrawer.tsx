import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, School, Pencil } from "lucide-react";
import { getStudents } from "@/lib/students-api";
import {
  bulkDeleteAttendance,
  bulkUpsertAttendance,
  getClassAttendance,
  type AttendanceStatus,
} from "@/lib/attendance-api";
import { queryKeys } from "@/lib/queryKeys";
import { useClasses } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { getPendingLeaveRequests, type LeaveRequest } from "@/lib/leave-requests-api";
import { Button } from "@/components/ui/button";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import {
  AttendanceEditorContent,
  type ActiveStatus,
} from "@/components/teacher/AttendanceEditorContent";

type AttendanceRecord = {
  attendanceId?: string;
  status: AttendanceStatus | null;
  notes: string;
  lateComing: boolean;
  lateComingTime: string;
  dirty: boolean;
};

function todayISO() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function TeacherAttendanceDrawer({
  open,
  onOpenChange,
  initialClassId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClassId?: string;
}) {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const { activeClass: defaultClass, isLoading: activeClassLoading } = useActiveClass();
  const queryClient = useQueryClient();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const classesQuery = useClasses({ clientId: cid, token });
  const classes = classesQuery.data ?? [];
  const classesLoading = classesQuery.isLoading || activeClassLoading;

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const activeClass = classes.find((cls) => cls.id === (selectedClassId ?? initialClassId))
    ?? defaultClass
    ?? classes[0]
    ?? null;
  const activeClassId = activeClass?.id ?? "";
  const isOwnClass = activeClass?.classTeacherId === user?.id;

  const [date, setDate] = useState(todayISO);
  const [students, setStudents] = useState<
    { id: string; name: string; adno: string; gender?: string; photoUrl?: string | null }[]
  >([]);
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [editing, setEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
  }, []);

  const loadAttendance = useCallback(async (classId: string, dateStr: string, signal?: AbortSignal) => {
    if (!cid || !token || !classId) return;
    setLoading(true);
    setError(null);
    setStudents([]);
    setRecords(new Map());
    try {
      const [attendanceRes, studentsRes, leaveRes] = await Promise.all([
        getClassAttendance(cid, token, {
          date: dateStr,
          classId,
          ...(user?.defaultAcademicYearId
            ? { academicYearId: user.defaultAcademicYearId }
            : {}),
          take: 500,
        }, signal),
        getStudents(cid, token, {
          classId,
          status: "ACTIVE",
          limit: 500,
          signal,
        }),
        getPendingLeaveRequests(cid, token, { classId, date: dateStr, status: "ALL", take: 500 }).catch(() => ({ requests: [] })),
      ]);
      if (signal?.aborted) return;

      const map = new Map<string, AttendanceRecord>();
      const hasExistingRecords = attendanceRes.records.length > 0;
      for (const student of studentsRes.data) {
        map.set(student.id, {
          status: hasExistingRecords ? null : "PRESENT",
          notes: "",
          lateComing: false,
          lateComingTime: "",
          dirty: !hasExistingRecords,
        });
      }
      for (const record of attendanceRes.records) {
        map.set(record.student.id, {
          attendanceId: record.id,
          status: record.status,
          notes: record.notes ?? "",
          lateComing: record.lateComing ?? false,
          lateComingTime: record.lateComingTime ?? "",
          dirty: false,
        });
      }
      setStudents(studentsRes.data.map((student) => ({
        id: student.id,
        name: student.name,
        adno: student.adno,
        gender: student.gender ?? undefined,
        photoUrl: student.photoUrl ?? student.photo,
      })));
      setLeaveRequests(leaveRes.requests ?? []);
      setRecords(map);
    } catch (cause) {
      if (signal?.aborted || (cause as Error).name === "AbortError") return;
      setError((cause as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setSaveError(null);
    setSaveSuccess(false);
    setConfirmSave(false);
    setConfirmClear(false);
    setEditing(false);
    setStatusFilter("ALL");
    if (activeClassId) void loadAttendance(activeClassId, date, controller.signal);
    return () => controller.abort();
  }, [open, activeClassId, date, loadAttendance]);

  const setStatus = (studentId: string, status: ActiveStatus) => {
    setRecords((previous) => {
      const next = new Map(previous);
      const record = next.get(studentId);
      if (record) next.set(studentId, {
        ...record,
        status,
        notes: status === "PRESENT" ? "" : record.notes,
        lateComing: status === "PRESENT" ? record.lateComing : false,
        lateComingTime: status === "PRESENT" ? record.lateComingTime : "",
        dirty: true,
      });
      return next;
    });
    setSaveSuccess(false);
  };

  const setNotes = (studentId: string, notes: string) => {
    setRecords((previous) => {
      const next = new Map(previous);
      const record = next.get(studentId);
      if (record) next.set(studentId, { ...record, notes, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const setLateComing = (studentId: string, lateComing: boolean, lateComingTime?: string) => {
    setRecords((previous) => {
      const next = new Map(previous);
      const record = next.get(studentId);
      if (record) next.set(studentId, {
        ...record,
        lateComing,
        lateComingTime: lateComing ? (lateComingTime ?? record.lateComingTime) : "",
        dirty: true,
      });
      return next;
    });
    setSaveSuccess(false);
  };

  const markAll = (status: ActiveStatus) => {
    setRecords((previous) => {
      const next = new Map(previous);
      for (const [id, record] of next) next.set(id, {
        ...record,
        status,
        notes: status === "PRESENT" ? "" : record.notes,
        lateComing: false,
        lateComingTime: "",
        dirty: true,
      });
      return next;
    });
    setSaveSuccess(false);
  };

  const hasDirty = useMemo(() => [...records.values()].some((record) => record.dirty), [records]);
  const hasExisting = useMemo(() => [...records.values()].some((record) => !!record.attendanceId), [records]);
  const summary = useMemo(() => {
    const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LEAVE: 0, SICK: 0, UNMARKED: 0 };
    for (const record of records.values()) {
      if (record.status) counts[record.status]++;
      else counts.UNMARKED++;
    }
    return counts;
  }, [records]);
  const pct = records.size > 0 ? Math.round((summary.PRESENT / records.size) * 100) : 0;
  const taken = [...records.values()].some((record) => !!record.attendanceId);
  const visibleStudents = students.filter((student) => {
    const record = records.get(student.id);
    if (!record?.attendanceId) return false;
    const leave = leaveRequests.find((item) => item.student.id === student.id);
    if (statusFilter === "APPROVED") return leave?.status === "APPROVED";
    if (statusFilter === "UNAPPROVED") return leave?.status !== "APPROVED";
    return statusFilter === "ALL" || record.status === statusFilter;
  });

  const invalidateAttendance = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.attendanceSummary(cid) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.classAttendanceSummary(cid, activeClassId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
    ]);
  }, [queryClient, cid, activeClassId]);

  const clearAll = useCallback(async () => {
    if (!activeClassId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await bulkDeleteAttendance(cid, token, { date, classId: activeClassId });
      await Promise.all([loadAttendance(activeClassId, date), invalidateAttendance()]);
    } catch (cause) {
      setSaveError((cause as Error).message);
    } finally {
      setSaving(false);
      setConfirmClear(false);
    }
  }, [activeClassId, cid, token, date, loadAttendance, invalidateAttendance]);

  const doSave = useCallback(async () => {
    if (!activeClassId || !cid || !token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const entries = [...records].flatMap(([studentId, record]) => record.status === null ? [] : [{
        studentId,
        status: record.status,
        notes: record.notes,
        lateComing: record.status === "PRESENT" && record.lateComing,
        lateComingTime: record.status === "PRESENT" && record.lateComing
          ? record.lateComingTime || null
          : null,
      }]);
      if (entries.length === 0) return;
      await bulkUpsertAttendance(cid, token, {
        classId: activeClassId,
        date,
        ...(user?.defaultAcademicYearId
          ? { academicYearId: user.defaultAcademicYearId }
          : {}),
        records: entries,
      });
      setSaveSuccess(true);
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
      await Promise.all([loadAttendance(activeClassId, date), invalidateAttendance()]);
    } catch (cause) {
      setSaveError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }, [activeClassId, cid, token, date, records, user?.defaultAcademicYearId, loadAttendance, invalidateAttendance]);

  const handleSave = () => {
    if (!activeClassId) return;
    if (!isOwnClass) {
      setConfirmSave(true);
      return;
    }
    void doSave();
  };

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      desktopView="right-drawer"
      fullHeight
       
      showBackButton={false}
      title={t("teacherPages", "markAttendanceDesc", lang)}
      contentClassName="px-5 py-6 sm:px-6"
    >
      <div className="mx-auto max-w-2xl">
        {error && (
          <ApiErrorBanner
            message={error}
            onRetry={() => activeClassId ? void loadAttendance(activeClassId, date) : undefined}
          />
        )}
        <div className="mb-6 space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <ScrollableDateNavigator
              date={date}
              onDateChange={setDate}
              pickerTitle="Choose attendance date"
              disabled={saving}
              hideCalendarButton
            />
            <DrawerSelector
              title={t("teacherPages", "selectClassOpt", lang)}
              value={activeClassId}
              onChange={setSelectedClassId}
              options={classes.map((cls) => ({
                value: cls.id,
                label: `${cls.name}${cls.classTeacherId === user?.id ? ` · ${t("teacherPages", "mineBadge", lang)}` : ""}`,
              }))}
              placeholder={classesLoading ? t("common", "loading", lang) : t("teacherPages", "noClassesFound", lang)}
              disabled={saving || classesLoading}
              optionClassName="text-sm"
              triggerItem={
                <Button variant="outline" className="h-14 w-12 rounded-lg px-0 py-1">
                  <School aria-hidden="true" className="size-5" />
                </Button>
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm font-medium text-gray-500">
            <span>{new Date(`${date}T00:00:00`).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="truncate text-right">{activeClass?.name ?? t("teacherPages", "noClassesFound", lang)}</span>
          </div>
        </div>
        {classesQuery.error && (
          <ApiErrorBanner message={classesQuery.error.message} onRetry={() => { void classesQuery.refetch(); }} />
        )}
        {taken && !editing && (
          <>
            <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-gray-100 pb-3">
              <ScrollableTabs
                options={[
                  { value: "ALL", label: "All" },
                  { value: "PRESENT", label: "Present" },
                  { value: "ABSENT", label: "Absent" },
                  { value: "SICK", label: "Sick" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "UNAPPROVED", label: "Unapproved" },
                ]}
                value={statusFilter}
                onValueChange={setStatusFilter}
                ariaLabel="Filter attendance by status"
                className="flex-1"
              />
              <Button type="button" variant="outline" className="shrink-0" onClick={() => setEditing(true)}><Pencil className="mr-2 size-4" />Edit</Button>
            </div>
            <div className="divide-y divide-gray-100">
              {visibleStudents.map((student) => {
                const record = records.get(student.id)!;
                const leave = leaveRequests.find((item) => item.student.id === student.id);
                const statusLabel = record.status === 'PRESENT' ? 'Present' : record.status === 'ABSENT' ? 'Absent' : record.status === 'SICK' ? 'Sick' : record.status === 'LEAVE' ? 'Leave' : record.status ?? 'Unmarked';
                const detail = [record.lateComing ? `Late coming${record.lateComingTime ? ` · ${record.lateComingTime}` : ''}` : '', leave ? `${leave.status === 'APPROVED' ? 'Approved' : leave.status === 'PENDING' ? 'Unapproved · pending review' : 'Unapproved · rejected'}${leave.description ? ` · ${leave.description}` : ''}${leave.reviewNote ? ` · ${leave.reviewNote}` : ''}` : '', record.notes].filter(Boolean).join(' · ');
                return <div key={student.id} className="flex items-center gap-3 py-3">
                  <StudentAvatar name={student.name} gender={student.gender} photoUrl={student.photoUrl} size="lg" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{student.name} <span className="font-normal text-gray-500">· {student.adno}</span></p>{detail && <p className="mt-0.5 truncate text-xs text-gray-500" title={detail}>{detail}</p>}</div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' : record.status === 'ABSENT' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{statusLabel}</span>
                </div>;
              })}
              {!visibleStudents.length && <p className="py-8 text-center text-sm text-gray-500">No attendance records match this filter.</p>}
            </div>
          </>
        )}
        {saveSuccess && (
          <p role="status" className="mb-4 flex items-center gap-1 text-sm font-semibold text-primary-600">
            <CheckCircle2 className="size-4" />
            {t("teacherPages", "saved", lang)}
          </p>
        )}
        {(!taken || editing) && <div aria-busy={loading || classesLoading}>
          <AttendanceEditorContent
            isOwnClass={isOwnClass}
            activeClassId={activeClassId}
            classesLoading={classesLoading}
            records={records}
            summary={summary}
            pct={pct}
            confirmClear={confirmClear}
            setConfirmClear={setConfirmClear}
            activeClassName={activeClass?.name}
            date={date}
            clearAll={() => { void clearAll(); }}
            saving={saving}
            markAll={markAll}
            saveError={saveError}
            loading={loading}
            error={error}
            students={students}
            setStatus={setStatus}
            setNotes={setNotes}
            setLateComing={setLateComing}
            hasDirty={hasDirty}
            hasExisting={hasExisting}
            handleSave={handleSave}
            editMode={editing && taken}
            onCancelEdit={() => {
              setEditing(false);
              setSaveError(null);
              setSaveSuccess(false);
              if (activeClassId) void loadAttendance(activeClassId, date);
            }}
          />
        </div>}
      </div>
      {confirmSave && activeClass && (
        <div className="fixed inset-0 z-1050 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <AlertTriangle className="size-5 text-amber-600" />
              </span>
              <div>
                <p className="font-bold text-gray-900">{t("teacherPages", "markingOtherClass", lang)}</p>
                <p className="mt-0.5 text-sm text-gray-500">{activeClass.name}</p>
              </div>
            </div>
            <p className="mb-5 text-sm text-gray-600">{t("teacherPages", "markingOtherDesc", lang)}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmSave(false)}>
                {t("common", "cancel", lang)}
              </Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => { setConfirmSave(false); void doSave(); }}>
                {t("teacherPages", "yesSaveBtn", lang)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ResponsivePopover>
  );
}
