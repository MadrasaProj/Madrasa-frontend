import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  checkIn,
  checkOut,
  getTodaySession,
  getSessionHistory,
  getTodayAllSessions,
  getSessionsByDate,
  getSessionsByTeacher,
} from "@/lib/teacher-session-api";

export function useTodaySession() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.teacherSession.today(activeClientId ?? ""),
    queryFn: () => getTodaySession(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useTodayAllSessions() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.teacherSession.todayAll(activeClientId ?? ""),
    queryFn: () => getTodayAllSessions(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useSessionHistory(params?: {
  teacherId?: string;
  page?: number;
  limit?: number;
}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.teacherSession.history(
      activeClientId ?? "",
      params ?? {},
    ),
    queryFn: () => getSessionHistory(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useSessionsByDate(date: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.teacherSession.byDate(activeClientId ?? "", date),
    queryFn: () => getSessionsByDate(activeClientId!, accessToken!, date),
    enabled: !!activeClientId && !!accessToken && !!date,
  });
}

export function useSessionsByTeacher(
  teacherId: string,
  from?: string,
  to?: string,
) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.teacherSession.byTeacher(
      activeClientId ?? "",
      teacherId,
    ),
    queryFn: () =>
      getSessionsByTeacher(activeClientId!, accessToken!, teacherId, from, to),
    enabled: !!activeClientId && !!accessToken && !!teacherId,
  });
}

export function useCheckIn() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (location?: {
      latitude: number;
      longitude: number;
      address?: string;
    }) => checkIn(activeClientId!, accessToken!, location),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teacherSession.all });
    },
  });
}

export function useCheckOut() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => checkOut(activeClientId!, accessToken!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teacherSession.all });
    },
  });
}
