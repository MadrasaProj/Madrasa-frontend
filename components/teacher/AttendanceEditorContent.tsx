import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock3,
  HeartPulse,
  Loader2,
  Percent,
  Save,
  Trash2,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsivePopover,
  TimePicker,
} from "@/components/ui/responsivePopover";
import { cn } from "@/lib/utils";
import { type AttendanceStatus } from "@/lib/attendance-api";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";

const ACTIVE_STATUSES = ["PRESENT", "ABSENT", "LEAVE", "SICK"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

const STATUS_CONFIG: Record<
  string,
  { short: string; bg: string; text: string; rowBg: string }
> = {
  PRESENT: {
    short: "P",
    bg: "bg-primary-100",
    text: "text-primary-700",
    rowBg: "border-primary-200 bg-primary-50/40",
  },
  ABSENT: {
    short: "A",
    bg: "bg-red-100",
    text: "text-red-600",
    rowBg: "border-red-200 bg-red-50/40",
  },
  LEAVE: {
    short: "L",
    bg: "bg-amber-100",
    text: "text-amber-700",
    rowBg: "border-amber-200 bg-amber-50/40",
  },
  SICK: {
    short: "S",
    bg: "bg-blue-100",
    text: "text-blue-700",
    rowBg: "border-blue-200 bg-blue-50/40",
  },
};

interface AttendanceEditorRecord {
  attendanceId?: string;
  status: AttendanceStatus | null;
  notes: string;
  lateComing: boolean;
  lateComingTime: string;
  dirty: boolean;
}

interface AttendanceEditorContentProps {
  isOwnClass: boolean;
  activeClassId: string | null;
  classesLoading: boolean;
  records: Map<string, AttendanceEditorRecord>;
  summary: Record<string, number>;
  pct: number;
  confirmClear: boolean;
  setConfirmClear: (open: boolean) => void;
  activeClassName?: string;
  date: string;
  clearAll: () => void;
  saving: boolean;
  markAll: (status: ActiveStatus) => void;
  saveError: string | null;
  loading: boolean;
  error: string | null;
  students: { id: string; name: string; adno: string; gender?: string; photoUrl?: string | null }[];
  setStatus: (studentId: string, status: ActiveStatus) => void;
  setNotes: (studentId: string, notes: string) => void;
  setLateComing: (
    studentId: string,
    lateComing: boolean,
    lateComingTime?: string,
  ) => void;
  hasDirty: boolean;
  hasExisting: boolean;
  handleSave: () => void;
}

export function AttendanceEditorContent(props: AttendanceEditorContentProps) {
  const { lang } = useLanguageStore();
  const [detailsStudentId, setDetailsStudentId] = useState<string | null>(null);
  const {
    isOwnClass,
    activeClassId,
    classesLoading,
    records,
    summary,
    pct,
    confirmClear,
    setConfirmClear,
    activeClassName,
    date,
    clearAll,
    saving,
    markAll,
    saveError,
    loading,
    error,
    students,
    setStatus,
    setNotes,
    setLateComing,
    hasDirty,
    hasExisting,
    handleSave,
  } = props;
  const detailsStudent = students.find(
    (student) => student.id === detailsStudentId,
  );
  const detailsRecord = detailsStudentId
    ? records.get(detailsStudentId)
    : undefined;
  const detailsStatus = detailsRecord?.status ?? null;

  return (
    <>
      {!isOwnClass && activeClassId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-amber-700 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t("teacherPages", "markingOtherDesc", lang)}
        </div>
      )}

      {!activeClassId && !classesLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-semibold text-gray-500">
            {t("teacherPages", "selectClassView", lang)}
          </p>
        </div>
      )}

      <AnimatePresence>
        {confirmClear && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {t("teacherPages", "clearAttendanceTitle", lang)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {activeClassName} · {date}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                {t("teacherPages", "clearAttendanceDesc", lang)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  {t("common", "cancel", lang)}
                </button>
                <button
                  onClick={clearAll}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
                >
                  {saving
                    ? t("teacherPages", "clearingLabel", lang)
                    : t("teacherPages", "yesClearAll", lang)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {saveError && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}

      {activeClassId &&
        (loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center gap-3"
              >
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">
              {t("teacherPages", "noActiveStudents", lang)}
            </p>
          </div>
        ) : (
          <div className="pb-3">
            {students.map((student) => {
              const record = records.get(student.id);
              const status = record?.status ?? null;
              const config = status ? STATUS_CONFIG[status] : null;
              return (
                <div
                  key={student.id}
                  className={cn(
                    "relative border-b border-gray-100 last:border-b-0 transition-all",
                    record?.dirty && (config ? config.text : "text-amber-700"),
                  )}
                >
                  <div className="flex items-center gap-3   py-3">
                    <StudentAvatar name={student.name} gender={student.gender} photoUrl={student.photoUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-400">{student.adno}</p>

                      <div>
                        {status === "PRESENT" && record?.lateComing && (
                          <p className="  bottom-1 left-16 right-14 truncate text-xs text-amber-700">
                            {t("teacherPages", "lateComing", lang)}
                            {record.lateComingTime
                              ? ` · ${record.lateComingTime}`
                              : ""}
                          </p>
                        )}
                        {status && status !== "PRESENT" && (
                          <p className="  bottom-1 left-16 right-14 truncate text-xs text-gray-500">
                            {status === "LEAVE"
                              ? t("teacherPages", "approvedLeave", lang)
                              : status === "SICK"
                                ? t("teacherPages", "sickLeave", lang)
                                : t("teacherPages", "unapprovedAbsence", lang)}
                            {record?.notes ? ` · ${record.notes}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={status === "PRESENT"}
                        onCheckedChange={(checked) =>
                          setStatus(student.id, checked ? "PRESENT" : "ABSENT")
                        }
                        aria-label={`${student.name}: ${t("teacherPages", "present", lang)}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${student.name}: ${t("teacherPages", "attendanceMore", lang)}`}
                        onClick={() => setDetailsStudentId(student.id)}
                      >
                        <MoreHorizontal className="size-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      <ResponsivePopover
        open={!!detailsStudent}
        onOpenChange={(open) => {
          if (!open) setDetailsStudentId(null);
        }}
        title={detailsStudent?.name ?? ""}
        description={detailsStudent?.adno}
        compact
        footer={
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => setDetailsStudentId(null)}
            >
              {t("teacherPages", "attendanceDetailsDone", lang)}
            </Button>
          </div>
        }
      >
        {detailsStudent && detailsStudentId && (
          <div className="space-y-3 px-4 pb-4 pt-1">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {t("teacherPages", "present", lang)}
                </p>
                <p className="text-xs text-gray-500">
                  {detailsStatus === "PRESENT"
                    ? t("teacherPages", "markedPresent", lang)
                    : detailsStatus === null
                      ? t("teacherPages", "attendanceUnmarkedDay", lang)
                      : t("teacherPages", "markedAbsent", lang)}
                </p>
              </div>
              <Switch
                checked={detailsStatus === "PRESENT"}
                onCheckedChange={(checked) =>
                  setStatus(detailsStudentId, checked ? "PRESENT" : "ABSENT")
                }
                aria-label={`${detailsStudent.name}: ${t("teacherPages", "present", lang)}`}
              />
            </div>
            {detailsStatus === "PRESENT" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                  <label
                    htmlFor="late-coming-switch"
                    className="text-sm font-medium text-gray-900"
                  >
                    {t("teacherPages", "lateComing", lang)}
                  </label>
                  <Switch
                    id="late-coming-switch"
                    checked={detailsRecord?.lateComing ?? false}
                    onCheckedChange={(checked) =>
                      setLateComing(detailsStudentId, checked)
                    }
                  />
                </div>
                {detailsRecord?.lateComing && (
                  <TimePicker
                    id="late-coming-time"
                    value={detailsRecord.lateComingTime}
                    onChange={(value) =>
                      setLateComing(detailsStudentId, true, value)
                    }
                    label={t("teacherPages", "arrivalTime", lang)}
                    placeholder={t("teacherPages", "selectArrivalTime", lang)}
                    hourLabel={t("teacherPages", "attendanceHour", lang)}
                    minuteLabel={t("teacherPages", "attendanceMinute", lang)}
                    clearLabel={t("teacherPages", "clearArrivalTime", lang)}
                    doneLabel={t("teacherPages", "arrivalTimeDone", lang)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    {t("teacherPages", "absenceType", lang)}
                  </p>
                  <Tabs
                    value={
                      detailsStatus === null
                        ? ""
                        : detailsStatus === "LEAVE" || detailsStatus === "SICK"
                          ? detailsStatus
                          : "ABSENT"
                    }
                    onValueChange={(value) =>
                      setStatus(detailsStudentId, value as ActiveStatus)
                    }
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100/80 p-1">
                      <TabsTrigger
                        value="ABSENT"
                        className="min-w-0 px-2 text-xs sm:text-sm"
                      >
                        {t("teacherPages", "unapprovedAbsence", lang)}
                      </TabsTrigger>
                      <TabsTrigger
                        value="LEAVE"
                        className="min-w-0 px-2 text-xs sm:text-sm"
                      >
                        {t("teacherPages", "approvedLeave", lang)}
                      </TabsTrigger>
                      <TabsTrigger
                        value="SICK"
                        className="min-w-0 px-2 text-xs sm:text-sm"
                      >
                        {t("teacherPages", "sickLeave", lang)}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="attendance-note"
                    className="text-xs font-semibold text-gray-500"
                  >
                    {t("teacherPages", "attendanceNote", lang)}
                  </label>
                  <Textarea
                    id="attendance-note"
                    maxLength={500}
                    value={detailsRecord?.notes ?? ""}
                    onChange={(event) =>
                      setNotes(detailsStudentId, event.target.value)
                    }
                    placeholder={t("teacherPages", "addNoteOptional", lang)}
                    className="min-h-24 bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsivePopover>

      {activeClassId && (hasDirty || hasExisting) && (
        <div className="sticky bottom-0 z-20 w-max py-4">
          <div className="pointer-events-auto mx-auto flex w-full max-w-2xl gap-3">
            {hasExisting && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmClear(true)}
                size="lg"
                className="bg-red-500 text-white hover:bg-red-600"
              >
                <Trash2 className="w-5 h-5" />{" "}
                {t("teacherPages", "clearAllBtn", lang)}
              </Button>
            )}

            {hasDirty && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="bg-primary-600 text-white hover:bg-primary-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />{" "}
                    {t("teacherPages", "savingEllipsis", lang)}
                  </>
                ) : (
                  <>{t("teacherPages", "saveAttendanceCount", lang)}</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
