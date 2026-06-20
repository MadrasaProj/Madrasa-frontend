import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getNotifications,
  getSentNotifications,
  getUnreadCount,
  createNotification,
  getDiaryEvents,
  markNotificationRead,
  deleteNotification,
  updateNotification,
  type NotificationType,
} from "@/lib/notifications-api";

export function useNotifications(params?: { skip?: number; take?: number }) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.notifications.inbox(activeClientId ?? "", params ?? {}),
    queryFn: () => getNotifications(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useSentNotifications(params?: { skip?: number; take?: number }) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.notifications.sent(activeClientId ?? "", params ?? {}),
    queryFn: () => getSentNotifications(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useUnreadCount() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(activeClientId ?? ""),
    queryFn: () => getUnreadCount(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
    refetchInterval: 60_000,
  });
}

export function useCreateNotification() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      body: string;
      type: NotificationType;
      targetRoles: string[];
      targetClassIds?: string[];
      eventDate?: string;
    }) => createNotification(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useUpdateNotification() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title: string;
        body: string;
        type: NotificationType;
        targetRoles: string[];
        targetClassIds?: string[];
        eventDate?: string;
      };
    }) => updateNotification(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDiaryEvents(params: {
  from: string;
  to: string;
  classId?: string;
}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.notifications.diaryEvents(activeClientId ?? "", params),
    queryFn: () => getDiaryEvents(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useMarkNotificationRead() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      markNotificationRead(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDeleteNotification() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteNotification(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
