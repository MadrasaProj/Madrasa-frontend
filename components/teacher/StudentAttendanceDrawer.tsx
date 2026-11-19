import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudentAttendance, type AttendanceStatus, type StudentAttendanceResponse } from "@/lib/attendance-api";
import { getHolidayCalendar, type Weekday } from "@/lib/holidays-api";
import { t } from "@/lib/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
const statusStyles: Record<AttendanceStatus, { cell: string; text: string; dot: string }> = {
  PRESENT: { cell: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-600" },
  ABSENT: { cell: "bg-red-100", text: "text-red-800", dot: "bg-red-600" },
  LATE: { cell: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  EXCUSED: { cell: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  LEAVE: { cell: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  SICK: { cell: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
};
const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "LEAVE", "SICK"] as const;
const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];

type Student = { id: string; name: string; adno: string };

function dateKey(year: number, monthNumber: number, day: number) {
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function StudentAttendanceDrawer({
  student,
  open,
  classId,
  clientId,
  token,
  onClose,
}: {
  student: Student;
  open: boolean;
  classId: string;
  clientId: string;
  token: string;
  onClose: () => void;
}) {
  const { lang } = useLanguageStore();
  const locale = lang === "ml" ? "ml-IN" : "en-IN";
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const attendance = useQuery<StudentAttendanceResponse, Error>({
    queryKey: queryKeys.attendance.student(clientId, student.id, { classId, timeline: true }),
    queryFn: async ({ signal }) => {
      const firstPage = await getStudentAttendance(clientId, token, student.id, { classId, take: 1000 }, signal);
      const records = [...firstPage.records];
      while (records.length < firstPage.total) {
        const nextPage = await getStudentAttendance(clientId, token, student.id, { classId, skip: records.length, take: 1000 }, signal);
        if (nextPage.records.length === 0) break;
        records.push(...nextPage.records);
      }
      return { ...firstPage, records };
    },
    enabled: !!clientId && !!token && !!student.id && !!classId,
    refetchOnMount: "always",
  });
  const academicYearId = attendance.data?.academicYearId;
  const holidays = useQuery({
    queryKey: ["holidays", clientId, academicYearId],
    queryFn: ({ signal }) => getHolidayCalendar(clientId, token, academicYearId!, signal),
    enabled: !!clientId && !!token && !!academicYearId,
    staleTime: 60_000,
  });
  const recordsByDate = useMemo(
    () => new Map(attendance.data?.records.map((record) => [record.date.slice(0, 10), record]) ?? []),
    [attendance.data?.records],
  );
  const months = useMemo(() => {
    const today = new Date();
    const keys = new Set<string>([
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    ]);
    for (const date of attendance.data?.workingDates ?? []) keys.add(date.slice(0, 7));
    for (const record of attendance.data?.records ?? []) keys.add(record.date.slice(0, 7));
    return [...keys].sort().reverse();
  }, [attendance.data]);
  const overallWorkingDays = attendance.data?.workingDates?.length ?? 0;
  const overallPresentDays = attendance.data?.records.filter((record) => record.status === "PRESENT").length ?? 0;
  const overallPercentage = attendance.data?.rate
    ?? (overallWorkingDays > 0 ? Math.min(100, Math.round((overallPresentDays / overallWorkingDays) * 100)) : 0);
  const selectedRecord = selectedDate ? recordsByDate.get(selectedDate) : undefined;

  const holidayInfo = useMemo(() => {
    const explicit = new Map<string, string>();
    for (const holiday of holidays.data?.holidays ?? []) {
      const scoped = holiday.classes ?? [];
      if (scoped.length > 0 && !scoped.includes(classId)) continue;
      const start = new Date(`${holiday.date}T00:00:00`);
      const end = new Date(`${holiday.endDate ?? holiday.date}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) continue;
      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard++ < 10000) {
        explicit.set(dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()), holiday.title);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return { explicit, weekly: new Set<Weekday>(holidays.data?.weeklyHolidays ?? []) };
  }, [holidays.data, classId]);

  const workingDateSet = useMemo(
    () => new Set(attendance.data?.workingDates ?? []),
    [attendance.data?.workingDates],
  );
  const periodFrom = attendance.data?.period?.from;
  const periodTo = attendance.data?.period?.to;
  const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  function holidayLabelFor(key: string) {
    const explicit = holidayInfo.explicit.get(key);
    if (explicit) return explicit;
    const [year, monthNumber, day] = key.split("-").map(Number);
    const weekday = WEEKDAY_BY_JS_DAY[new Date(year, monthNumber - 1, day).getDay()];
    if (holidayInfo.weekly.has(weekday)) return t("teacherPages", "attendanceWeeklyHoliday", lang);
    // Fallback: inside the academic-year window, any day that is not a working
    // day is a holiday (weekly off or configured holiday) even when the
    // holiday calendar endpoint is unavailable.
    if (periodFrom && periodTo && key >= periodFrom && key <= periodTo && key <= todayKey &&
        !workingDateSet.has(key)) {
      return t("teacherPages", "attendanceHolidayLabel", lang);
    }
    return undefined;
  }

  const holidaysInView = useMemo(() => {
    const keys = new Set<string>();
    for (const monthKey of months) {
      const [year, monthNumber] = monthKey.split("-").map(Number);
      const lastDay = new Date(year, monthNumber, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        const key = dateKey(year, monthNumber, day);
        if (holidayLabelFor(key)) keys.add(key);
      }
    }
    return keys;
  }, [months, holidayInfo, workingDateSet, periodFrom, periodTo, todayKey, lang]);

  function statusLabel(status: AttendanceStatus) {
    switch (status) {
      case "PRESENT": return t("common", "present", lang);
      case "ABSENT": return t("common", "absent", lang);
      case "LATE": return t("teacherPages", "attendanceStatusLate", lang);
      case "EXCUSED": return t("teacherPages", "attendanceStatusExcused", lang);
      case "LEAVE": return t("teacherPages", "attendanceStatusLeave", lang);
      case "SICK": return t("teacherPages", "attendanceStatusSick", lang);
    }
  }

  return (
    <>
    <ResponsivePopover
      open={open}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={student.name}
      desktopView="right-drawer"
      description={<span className="text-sm">{t("teacherPages", "studentAttendanceDetails", lang)} · {student.adno}</span>}
    >
 
      {attendance.isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : attendance.isError ? (
        <ApiErrorBanner message={attendance.error.message} onRetry={() => { void attendance.refetch(); }} />
      ) : (
        <>
          <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
 
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              <div className="min-w-0 bg-white/90 p-2.5 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">{t("teacherPages", "attendanceWorkingDays", lang)}</p>
                <strong className="mt-2 block text-xl sm:text-2xl font-semibold tabular-nums text-gray-950">{overallWorkingDays}</strong>
              </div>
              <div className="min-w-0 bg-white/90 p-2.5 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">{t("teacherPages", "attendanceHolidays", lang)}</p>
                <strong className="mt-2 block text-xl sm:text-2xl font-semibold tabular-nums text-indigo-700">{holidaysInView.size}</strong>
              </div>
              <div className="min-w-0 bg-white/90 p-2.5 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">{t("teacherPages", "attendanceRateLabel", lang)}</p>
                <strong className="mt-2 block text-xl sm:text-2xl font-semibold tabular-nums text-gray-950">{overallPercentage}%</strong>
                
              </div>
            </div>
            <p className="border-t border-gray-100 bg-white/90 px-3 py-2 text-xs text-gray-600">
              {t("teacherPages", "attendanceHolidaysNote", lang).replace("{count}", String(holidaysInView.size))}
            </p>
          </section>
          <div className="divide-y divide-gray-200">
            {months.map((monthKey) => {
              const [year, monthNumber] = monthKey.split("-").map(Number);
              const month = new Date(year, monthNumber - 1, 1);
              const monthLabel = month.toLocaleDateString(locale, { month: "long", year: "numeric" });
              const lastDay = new Date(year, monthNumber, 0).getDate();
              const workingDays = attendance.data?.workingDates?.filter((date) => date.startsWith(monthKey)).length ?? 0;
              const presentDays = attendance.data?.records.filter((record) => record.date.startsWith(monthKey) && record.status === "PRESENT").length ?? 0;
              const percentage = workingDays > 0 ? Math.min(100, Math.round((presentDays / workingDays) * 100)) : 0;
              const monthHolidays = [...holidaysInView].filter((key) => key.startsWith(monthKey)).length;
              return (
                <section key={monthKey} className="py-5">
                  <h3 className="text-base font-semibold text-gray-900">{monthLabel}</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    {t("teacherPages", "attendanceWorkingDays", lang)}: <span className="font-medium tabular-nums text-gray-900">{workingDays}</span>
                    {" · "}
                    {t("teacherPages", "attendanceHolidays", lang)}: <span className="font-medium tabular-nums text-indigo-700">{monthHolidays}</span>
                    {" · "}
                    {t("teacherPages", "attendanceThisMonth", lang)}: <span className="font-medium tabular-nums text-gray-900">{presentDays}/{workingDays} ({percentage}%)</span>
                  </p>
                  <div className="grid grid-cols-7 gap-1" role="group" aria-label={monthLabel}>
                    {weekdays.map((weekday) => (
                      <span
                        key={weekday}
                        className="py-1 text-center text-xs font-medium text-gray-500"
                        aria-label={new Date(2023, 0, 1 + weekday).toLocaleDateString(locale, { weekday: "long" })}
                      >
                        {new Date(2023, 0, 1 + weekday).toLocaleDateString(locale, { weekday: "narrow" })}
                      </span>
                    ))}
                    {Array.from({ length: month.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
                    {Array.from({ length: lastDay }, (_, index) => {
                      const day = index + 1;
                      const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
                      const record = recordsByDate.get(dateKey);
                      const status = record?.status;
                      const holidayTitle = holidayLabelFor(dateKey);
                      const dateLabel = new Date(year, monthNumber - 1, day).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDate(dateKey)}
                          title={holidayTitle}
                          aria-label={`${dateLabel}: ${status ? statusLabel(status) : holidayTitle ? `${t("teacherPages", "attendanceHolidayLabel", lang)}: ${holidayTitle}` : t("teacherPages", "attendanceUnmarkedDay", lang)}`}
                          aria-pressed={selectedDate === dateKey}
                          className={cn(
                            "aspect-square rounded-lg text-sm font-semibold tabular-nums transition-colors",
                            status
                              ? `${statusStyles[status].cell} ${statusStyles[status].text}`
                              : holidayTitle ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-500",
                            selectedDate === dateKey && "ring-2 ring-gray-900 ring-offset-1",
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {workingDays === 0 && (
                    <p className="mt-3 text-sm text-gray-600">{t("teacherPages", "attendanceMonthEmpty", lang)}</p>
                  )}

                </section>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-200 py-4">
            {statuses.map((status) => (
              <span key={status} className="inline-flex items-center gap-2 text-xs text-gray-600">
                <span className={cn("size-2.5 rounded-full", statusStyles[status].dot)} aria-hidden="true" />
                {statusLabel(status)}
              </span>
            ))}
            {holidaysInView.size > 0 && (
              <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                <span className="size-2.5 rounded-full bg-indigo-500" aria-hidden="true" />
                {t("teacherPages", "attendanceHolidayLabel", lang)}
              </span>
            )}
          </div>
        </>
      )}
    </ResponsivePopover>

    <ResponsivePopover
      open={!!selectedDate}
      onOpenChange={(nextOpen) => { if (!nextOpen) setSelectedDate(null); }}
      title={selectedDate
        ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
        : ""}
      compact
      description={selectedDate
        ? selectedRecord
          ? statusLabel(selectedRecord.status)
          : holidayLabelFor(selectedDate)
            ? `${t("teacherPages", "attendanceHolidayLabel", lang)}: ${holidayLabelFor(selectedDate)}`
            : t("teacherPages", "attendanceUnmarkedDay", lang)
        : undefined}
    >
      <div className="p-4">
        {selectedRecord?.notes && <p className="text-sm text-gray-600">{selectedRecord.notes}</p>}
      </div>
    </ResponsivePopover>
    </>
  );
}
