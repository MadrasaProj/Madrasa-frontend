import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getStudentHomework,
  parentSubmitHomework,
  type StudentHomeworkResponse,
} from "@/lib/homework-api";
import { getStudent, type StudentRecord } from "@/lib/students-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentHomework(
  ctx: AuthCtx,
  studentId: string,
  options?: Omit<UseQueryOptions<StudentHomeworkResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentHomeworkResponse, Error>({
    queryKey: queryKeys.homework.student(ctx.clientId, studentId),
    queryFn: () => getStudentHomework(ctx.clientId, ctx.token, studentId),
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}

export function useStudentRecord(
  ctx: AuthCtx,
  studentId: string,
  options?: Omit<UseQueryOptions<StudentRecord | null, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentRecord | null, Error>({
    queryKey: ["students", "record", ctx.clientId, studentId],
    queryFn: async () => {
      try {
        return await getStudent(ctx.clientId, ctx.token, studentId);
      } catch {
        return null;
      }
    },
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}

/**
 * Mark a homework submission as submitted. The homework list for the
 * student is invalidated so the new status appears on the next read.
 */
export function useParentSubmitHomework(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<{ message: string; status: string }, Error, { studentId: string; submissionId: string }>({
    mutationFn: ({ submissionId }) => parentSubmitHomework(ctx.clientId, ctx.token, submissionId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.student(ctx.clientId, vars.studentId) });
    },
  });
}
