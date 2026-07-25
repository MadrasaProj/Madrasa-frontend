import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { listClients, type ClientListItem } from "@/lib/super-admin-api";

export function useClients(
  token: string,
  options?: Omit<UseQueryOptions<{ data: ClientListItem[] }, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<{ data: ClientListItem[] }, Error>({
    queryKey: queryKeys.superAdmin.clients(),
    queryFn: () => listClients(token),
    enabled: !!token,
    staleTime: 10 * 60_000, // cache for 10 minutes
    ...options,
  });
}
