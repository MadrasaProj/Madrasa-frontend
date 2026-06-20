import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  listHomework,
  createHomework,
  updateHomework,
  deleteHomework,
  getSubmissions,
  bulkUpdateSubmissions,
  getStudentHomework,
  parentSubmitHomework,
  type HomeworkStatus,
} from "@/lib/homework-api";

interface HomeworkParams {
  classId?: string;
  studentId?: string;
  from?: string;
  to?: string;
  academicYearId?: string;
}

export function useHomework(params?: HomeworkParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.homework.list(activeClientId ?? "", params ?? {}),
    queryFn: () => listHomework(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useCreateHomework() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      classId: string;
      subjectId?: string;
      title: string;
      description?: string;
      dueDate: string;
      academicYearId?: string;
    }) => createHomework(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.all });
    },
  });
}

export function useUpdateHomework() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        dueDate?: string;
        subjectId?: string;
      };
    }) => updateHomework(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.all });
    },
  });
}

export function useDeleteHomework() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteHomework(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.all });
    },
  });
}

export function useSubmissions(homeworkId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.homework.submissions(activeClientId ?? "", homeworkId),
    queryFn: () => getSubmissions(activeClientId!, accessToken!, homeworkId),
    enabled: !!activeClientId && !!accessToken && !!homeworkId,
  });
}

export function useBulkUpdateSubmissions() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      homeworkId,
      submissions,
    }: {
      homeworkId: string;
      submissions: {
        studentId: string;
        status: HomeworkStatus;
        teacherNote?: string;
      }[];
    }) =>
      bulkUpdateSubmissions(
        activeClientId!,
        accessToken!,
        homeworkId,
        submissions,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.all });
    },
  });
}

export function useStudentHomework(studentId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.homework.student(activeClientId ?? "", studentId),
    queryFn: () => getStudentHomework(activeClientId!, accessToken!, studentId),
    enabled: !!activeClientId && !!accessToken && !!studentId,
  });
}

export function useParentSubmitHomework() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) =>
      parentSubmitHomework(activeClientId!, accessToken!, submissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.all });
    },
  });
}
