import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getStudentAttendance, type StudentAttendanceResponse } from "@/lib/attendance-api";
import { getHolidayCalendar, type HolidayCalendar } from "@/lib/holidays-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentAttendance(
  ctx: AuthCtx,
  studentId: string,
  params?: { classId?: string; academicYearId?: string; from?: string; to?: string; take?: number },
  options?: Omit<UseQueryOptions<StudentAttendanceResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentAttendanceResponse, Error>({
    queryKey: queryKeys.attendance.student(ctx.clientId, studentId, params),
    queryFn: ({ signal }) => getStudentAttendance(ctx.clientId, ctx.token, studentId, params, signal),
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}

/** Holiday calendar for the academic year (individual holidays + weekly offs). */
export function useHolidayCalendar(
  ctx: AuthCtx,
  academicYearId?: string,
  options?: Omit<UseQueryOptions<HolidayCalendar, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<HolidayCalendar, Error>({
    queryKey: queryKeys.holidays.calendar(ctx.clientId, academicYearId ?? ""),
    queryFn: ({ signal }) =>
      getHolidayCalendar(ctx.clientId, ctx.token, academicYearId ?? "", signal),
    enabled: !!ctx.clientId && !!ctx.token && !!academicYearId,
    ...options,
  });
}
