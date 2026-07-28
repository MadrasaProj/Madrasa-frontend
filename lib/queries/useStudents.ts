import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getParentStudents,
  type StudentInfo,
} from "@/lib/auth-api";
import {
  deleteStudent,
  getStudents,
  getStudentProfileV2,
  updateStudent as updateStudentV2,
  uploadStudentPhoto,
  type GetStudentsParams,
  type StudentListResponse,
  type StudentRecord,
} from "@/lib/students-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentProfileV2(
  ctx: AuthCtx,
  studentId: string,
  options?: Omit<UseQueryOptions<StudentRecord, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentRecord, Error>({
    queryKey: queryKeys.students.profile(ctx.clientId, studentId),
    queryFn: ({ signal }) => getStudentProfileV2(ctx.clientId, ctx.token, studentId, signal),
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE = `${API_ORIGIN}/api/v2`;

export function useUpdateStudent(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<StudentRecord, Error, { studentId: string; data: Record<string, unknown> }>({
    mutationFn: async ({ studentId, data }) => {
      const res = await fetch(`${V2_BASE}/${ctx.clientId}/students/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Update failed" }));
        throw new Error(err.message ?? "Update failed");
      }
      return res.json();
    },
    onSuccess: (updated, vars) => {
      qc.setQueryData(queryKeys.students.profile(ctx.clientId, vars.studentId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}

export function useUploadStudentPhoto(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<
    { id: string; photo: string; photoUrl: string | null },
    Error,
    { studentId: string; file: File }
  >({
    mutationFn: ({ studentId, file }) => uploadStudentPhoto(ctx.clientId, ctx.token, studentId, file),
    onSuccess: (result, vars) => {
      const current = qc.getQueryData<StudentRecord>(queryKeys.students.profile(ctx.clientId, vars.studentId));
      if (current) {
        qc.setQueryData<StudentRecord>(queryKeys.students.profile(ctx.clientId, vars.studentId), {
          ...current,
          photo: result.photo,
          photoUrl: result.photoUrl,
        });
      }
    },
  });
}

export function useStudentsList(
  ctx: AuthCtx,
  params: GetStudentsParams & { classId?: string; gender?: string },
  options?: Omit<UseQueryOptions<StudentListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentListResponse, Error>({
    queryKey: queryKeys.students.list(ctx.clientId, params),
    queryFn: ({ signal }) =>
      getStudents(ctx.clientId, ctx.token, { ...params, signal }),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}

export function useDeleteStudent(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (studentId) => deleteStudent(ctx.clientId, ctx.token, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}

/**
 * Fetches the full parent students list (with photo, photoUrl, contact,
 * address, accademicYear, etc.) and indexes it by student ID. Cached for
 * 5 minutes; rare to change.
 */
export function useParentStudents(
  token: string | null | undefined,
  options?: Omit<UseQueryOptions<Record<string, StudentInfo>, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<Record<string, StudentInfo>, Error>({
    queryKey: ["parentStudents", token ? "authed" : "anon"],
    queryFn: async () => {
      if (!token) return {};
      const { data } = await getParentStudents(token);
      return Object.fromEntries(data.map((s) => [s.id, s]));
    },
    enabled: !!token,
    staleTime: 5 * 60_000,
    ...options,
  });
}
