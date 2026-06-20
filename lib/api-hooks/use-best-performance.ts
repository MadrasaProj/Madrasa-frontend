import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import { getBestPerformers } from "@/lib/best-performance-api";

interface BestPerformanceParams {
  from?: string;
  to?: string;
  classId?: string;
  academicYearId?: string;
  limit?: number;
}

export function useBestPerformers(params?: BestPerformanceParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.bestPerformance.list(
      activeClientId ?? "",
      params ?? {},
    ),
    queryFn: () => getBestPerformers(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}
