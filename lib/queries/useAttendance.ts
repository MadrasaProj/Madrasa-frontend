import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getStudentAttendance, type StudentAttendanceResponse } from "@/lib/attendance-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentAttendance(
  ctx: AuthCtx,
  studentId: string,
  params?: { academicYearId?: string; from?: string; to?: string; take?: number },
  options?: Omit<UseQueryOptions<StudentAttendanceResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentAttendanceResponse, Error>({
    queryKey: queryKeys.attendance.student(ctx.clientId, studentId, params),
    queryFn: ({ signal }) => getStudentAttendance(ctx.clientId, ctx.token, studentId, params, signal),
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}
