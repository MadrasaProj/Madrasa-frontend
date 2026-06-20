import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getPosters,
  getPoster,
  createPoster,
  updatePoster,
  deletePoster,
  type CreatePosterPayload,
  type UpdatePosterPayload,
} from "@/lib/posters-api";

export function usePosters(params?: {
  page?: number;
  limit?: number;
}) {
  const { activeClientId } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.posters.list(activeClientId ?? "", params ?? {}),
    queryFn: ({ signal }) => getPosters(activeClientId!, { ...params, signal }),
    enabled: !!activeClientId,
  });
}

export function usePoster(posterId: string) {
  const { activeClientId } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.posters.detail(activeClientId ?? "", posterId),
    queryFn: ({ signal }) => getPoster(activeClientId!, posterId, signal),
    enabled: !!activeClientId && !!posterId,
  });
}

export function useCreatePoster() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePosterPayload) =>
      createPoster(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posters.all });
    },
  });
}

export function useUpdatePoster() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      posterId,
      data,
    }: {
      posterId: string;
      data: UpdatePosterPayload;
    }) => updatePoster(activeClientId!, accessToken!, posterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posters.all });
    },
  });
}

export function useDeletePoster() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (posterId: string) =>
      deletePoster(activeClientId!, accessToken!, posterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posters.all });
    },
  });
}
