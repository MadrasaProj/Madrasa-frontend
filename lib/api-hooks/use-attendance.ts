import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getClassAttendance,
  bulkUpsertAttendance,
  updateAttendanceRecord,
  getStudentAttendance,
  type AttendanceEntry,
} from "@/lib/attendance-api";

interface ClassAttendanceParams {
  date: string;
  classId?: string;
  academicYearId?: string;
  skip?: number;
  take?: number;
}

interface StudentAttendanceParams {
  studentId: string;
  academicYearId?: string;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
}

export function useClassAttendance(params: ClassAttendanceParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.attendance.class(activeClientId ?? "", params),
    queryFn: ({ signal }) =>
      getClassAttendance(activeClientId!, accessToken!, params, signal),
    enabled: !!activeClientId && !!accessToken && !!params.date,
  });
}

export function useStudentAttendance(params: StudentAttendanceParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.attendance.student(activeClientId ?? "", params.studentId),
    queryFn: ({ signal }) =>
      getStudentAttendance(activeClientId!, accessToken!, params.studentId, params, signal),
    enabled: !!activeClientId && !!accessToken && !!params.studentId,
  });
}

export function useBulkUpsertAttendance() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      classId: string;
      date: string;
      academicYearId?: string;
      records: AttendanceEntry[];
    }) => bulkUpsertAttendance(activeClientId!, accessToken!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      attendanceId,
      data,
    }: {
      attendanceId: string;
      data: { status?: import("@/lib/attendance-api").AttendanceStatus; notes?: string };
    }) => updateAttendanceRecord(activeClientId!, accessToken!, attendanceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
}
