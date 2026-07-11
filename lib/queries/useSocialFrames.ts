import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getSocialFrame,
  getSocialFrames,
  type SocialFrameListResponse,
  type SocialFrameRecord,
} from "@/lib/social-frames-api";

export function useSocialFrames(
  clientId: string,
  params?: { page?: number; limit?: number },
  options?: Omit<UseQueryOptions<SocialFrameListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<SocialFrameListResponse, Error>({
    queryKey: queryKeys.socialFrames.list(clientId, params),
    queryFn: ({ signal }) => getSocialFrames(clientId, { ...params, signal }),
    enabled: !!clientId,
    ...options,
  });
}

export function useSocialFrame(
  clientId: string,
  frameId: string,
  options?: Omit<UseQueryOptions<SocialFrameRecord, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<SocialFrameRecord, Error>({
    queryKey: queryKeys.socialFrames.detail(clientId, frameId),
    queryFn: ({ signal }) => getSocialFrame(clientId, frameId, signal),
    enabled: !!clientId && !!frameId,
    ...options,
  });
}
