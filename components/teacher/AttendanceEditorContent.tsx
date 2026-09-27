import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    rowBg: "border-emerald-200 bg-emerald-50/40",
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
  students: { id: string; name: string; adno: string; gender?: string }[];
  setStatus: (studentId: string, status: ActiveStatus) => void;
  setNotes: (studentId: string, notes: string) => void;
  hasDirty: boolean;
  hasExisting: boolean;
  handleSave: () => void;
}

export function AttendanceEditorContent(props: AttendanceEditorContentProps) {
  const { lang } = useLanguageStore();
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
    hasDirty,
    hasExisting,
    handleSave,
  } = props;

  return (
    <>
      {!isOwnClass && activeClassId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-amber-700 text-xs font-semibold">
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

      {activeClassId && records.size > 0 && (
        <>
          <div className="grid grid-cols-3 mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white divide-x divide-y divide-gray-100">
            {[
              {
                key: "PRESENT",
                label: t("teacherPages", "present", lang),
                cls: "text-emerald-600",
              },
              {
                key: "ABSENT",
                label: t("teacherPages", "absent", lang),
                cls: "text-red-500",
              },
              {
                key: "LEAVE",
                label: t("teacherPages", "leaveLabel", lang),
                cls: "text-amber-600",
              },
              {
                key: "SICK",
                label: t("teacherPages", "sickLabel", lang),
                cls: "text-blue-600",
              },
              {
                key: "UNMARKED",
                label: t("teacherPages", "unmarkedLabel", lang),
                cls: "text-gray-400",
              },
            ].map(({ key, label, cls }) => (
              <div key={key} className="min-w-0 p-3 sm:p-3.5">
                <p className="text-[10px] font-semibold text-gray-500 truncate">
                  {label}
                </p>
                <p
                  className={cn("mt-1 text-2xl font-bold tracking-tight", cls)}
                >
                  {summary[key] ?? 0}
                </p>
              </div>
            ))}
            <div className="min-w-0 p-3 sm:p-3.5">
              <p className="text-[10px] font-semibold text-gray-500 truncate">
                {t("teacherPages", "attendanceRateLabel", lang)}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
                {pct}%
              </p>
            </div>
          </div>
        </>
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
                  <p className="text-xs text-gray-500 mt-0.5">
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

      {activeClassId && records.size > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500">
            {t("teacherPages", "markAllLabel", lang)}
          </p>
          <ButtonGroup className="w-full gap-1">
            {ACTIVE_STATUSES.map((status) => (
              <Button
                key={status}
                type="button"
                size="lg"
                variant="ghost"
                onClick={() => markAll(status)}
                className={cn(
                  "flex-1 border-0 bg-gray-50",
                  status === "PRESENT" &&
                    "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700",
                  status === "ABSENT" &&
                    "text-red-600 hover:bg-red-50 hover:text-red-700",
                  status === "LEAVE" &&
                    "text-amber-600 hover:bg-amber-50 hover:text-amber-700",
                  status === "SICK" &&
                    "text-blue-600 hover:bg-blue-50 hover:text-blue-700",
                )}
              >
                {status === "PRESENT"
                  ? t("teacherPages", "present", lang)
                  : status === "ABSENT"
                    ? t("teacherPages", "absent", lang)
                    : status === "LEAVE"
                      ? t("teacherPages", "leaveLabel", lang)
                      : t("teacherPages", "sickLabel", lang)}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}

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
                <div className="flex items-center gap-1 shrink-0">
                  {ACTIVE_STATUSES.map((status) => (
                    <Skeleton key={status} className="w-7 h-7 rounded-lg" />
                  ))}
                </div>
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
          <div className="space-y-2 pb-4">
            {students.map((student) => {
              const record = records.get(student.id);
              const status = record?.status ?? null;
              const config = status ? STATUS_CONFIG[status] : null;
              return (
                <div
                  key={student.id}
                  className={cn(
                    "border-b border-gray-100 last:border-b-0 transition-all",
                    record?.dirty && (config ? config.text : "text-amber-700"),
                  )}
                >
                  <div className="p-3.5 flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                        student.gender === "FEMALE"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-400">{student.adno}</p>
                    </div>
                    <ButtonGroup className="gap-1 shrink-0">
                      {ACTIVE_STATUSES.map((nextStatus) => (
                        <button
                          key={nextStatus}
                           
                           onClick={() => setStatus(student.id, nextStatus)}
                           
                          className={cn(
                            "  rounded-full border border-gray-100  font-bold w-6 h-6 leading-1.5 inline-flex items-center justify-center",
                            status === nextStatus
                              ? [
                                  "border-transparent text-white hover:text-white",
                                  nextStatus === "PRESENT" &&
                                    "bg-emerald-600 hover:bg-emerald-700",
                                  nextStatus === "ABSENT" &&
                                    "bg-red-600 hover:bg-red-700",
                                  nextStatus === "LEAVE" &&
                                    "bg-amber-600 hover:bg-amber-700",
                                  nextStatus === "SICK" &&
                                    "bg-blue-600 hover:bg-blue-700",
                                ]
                              : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100",
                          )}
                        >
                          {STATUS_CONFIG[nextStatus].short}
                        </button>
                      ))}
                    </ButtonGroup>
                  </div>
                  {status && status !== "PRESENT" && (
                    <div className="px-3.5 pb-3">
                      <input
                        type="text"
                        placeholder={t("teacherPages", "addNoteOptional", lang)}
                        value={record?.notes ?? ""}
                        onChange={(event) =>
                          setNotes(student.id, event.target.value)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {activeClassId && (hasDirty || hasExisting) && (
        <div className="  bottom-20 lg:bottom-6 left-0 right-0 px-4 lg:pl-72 z-20 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl mx-auto flex gap-2">
            {hasExisting && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmClear(true)}
                size="lg"
                className="  bg-red-500 text-white hover:bg-red-600"
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
                className="  bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />{" "}
                    {t("teacherPages", "savingEllipsis", lang)}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />{" "}
                    {t("teacherPages", "saveAttendanceCount", lang)}  
                  </>
                )}
              </Button>
            )}
            
          </div>
        </div>
      )}
    </>
  );
}
