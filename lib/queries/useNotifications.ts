import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getDiaryEvents,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  type DiaryEventNotification,
  type NotificationsResponse,
  type NotificationRecord,
} from "@/lib/notifications-api";

export type AuthCtx = { clientId: string; token: string };

export function useNotifications(
  ctx: AuthCtx,
  params?: { take?: number },
  options?: Omit<UseQueryOptions<NotificationsResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<NotificationsResponse, Error>({
    queryKey: queryKeys.notifications.list(ctx.clientId, params),
    queryFn: ({ signal }) => getNotifications(ctx.clientId, ctx.token, { ...params, signal }),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}

export function useUnreadCount(
  ctx: AuthCtx,
  options?: Omit<UseQueryOptions<{ count: number }, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<{ count: number }, Error>({
    queryKey: queryKeys.notifications.unreadCount(ctx.clientId),
    queryFn: ({ signal }) => getUnreadCount(ctx.clientId, ctx.token, signal),
    enabled: !!ctx.clientId && !!ctx.token,
    refetchInterval: 60_000,
    ...options,
  });
}

export function useDiaryEvents(
  ctx: AuthCtx,
  params: { from: string; to: string; classId?: string },
  options?: Omit<UseQueryOptions<DiaryEventNotification[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<DiaryEventNotification[], Error>({
    queryKey: queryKeys.notifications.diaryEvents(ctx.clientId, params),
    queryFn: ({ signal }) => getDiaryEvents(ctx.clientId, ctx.token, { ...params, signal }),
    enabled: !!ctx.clientId && !!ctx.token && !!params.classId,
    ...options,
  });
}

/**
 * Optimistically mark a single notification read. The list cache updates
 * immediately and rolls back if the request fails. The unread-count
 * cache is invalidated either way.
 */
export function useMarkNotificationRead(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, string, { previous?: NotificationsResponse }>({
    mutationFn: (id) => markNotificationRead(ctx.clientId, ctx.token, id),
    onMutate: async (id) => {
      const key = queryKeys.notifications.list(ctx.clientId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NotificationsResponse>(key);
      if (previous) {
        qc.setQueryData<NotificationsResponse>(key, {
          ...previous,
          notifications: previous.notifications.map((n: NotificationRecord) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _id, ctxOnMutate) => {
      if (ctxOnMutate?.previous) {
        qc.setQueryData(queryKeys.notifications.list(ctx.clientId), ctxOnMutate.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(ctx.clientId) });
    },
  });
}

export function useMarkAllNotificationsRead(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, NotificationRecord[], { previous?: NotificationsResponse }>({
    mutationFn: async (unread) => {
      await Promise.all(
        unread.map((n) => markNotificationRead(ctx.clientId, ctx.token, n.id).catch(() => undefined)),
      );
    },
    onMutate: async (unread) => {
      const key = queryKeys.notifications.list(ctx.clientId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NotificationsResponse>(key);
      if (previous) {
        qc.setQueryData<NotificationsResponse>(key, {
          ...previous,
          notifications: previous.notifications.map((n) =>
            unread.some((u) => u.id === n.id) ? { ...n, isRead: true } : n,
          ),
        });
      }
      return { previous };
    },
    onError: (_e, _vars, ctxOnMutate) => {
      if (ctxOnMutate?.previous) {
        qc.setQueryData(queryKeys.notifications.list(ctx.clientId), ctxOnMutate.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(ctx.clientId) });
    },
  });
}
