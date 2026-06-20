import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import { getClientConfig, updateClientConfig } from "@/lib/config-api";

export function useClientConfig() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.config.client(activeClientId ?? ""),
    queryFn: () => getClientConfig(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useUpdateClientConfig() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      updateClientConfig(activeClientId!, accessToken!, data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.config.all });
    },
  });
}
