import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getStudentStats,
  getFeeSummary,
  getAttendanceSummary,
  getHomeworkSummary,
} from "@/lib/reports-api";

export function useStudentStats() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.reports.studentStats(activeClientId ?? ""),
    queryFn: () => getStudentStats(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useReportFeeSummary(academicYearId?: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.reports.feeSummary(
      activeClientId ?? "",
      academicYearId,
    ),
    queryFn: () =>
      getFeeSummary(activeClientId!, accessToken!, academicYearId),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useAttendanceSummary(from?: string, to?: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.reports.attendanceSummary(
      activeClientId ?? "",
      from,
      to,
    ),
    queryFn: () =>
      getAttendanceSummary(activeClientId!, accessToken!, from, to),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useHomeworkSummary() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.reports.homeworkSummary(activeClientId ?? ""),
    queryFn: () => getHomeworkSummary(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
  });
}
