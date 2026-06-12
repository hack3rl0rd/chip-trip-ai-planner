import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { socialApi } from "@/integrations/api";
import type { PublicFeedPage, PublicFeedSort } from "@/integrations/api";

export const exploreKeys = {
  feed: (destination: string, sort: PublicFeedSort) => ["publicFeed", destination, sort] as const,
  publicTrip: (tripId: number) => ["publicTrip", tripId] as const,
  likeStatus: (tripId: number) => ["likeStatus", tripId] as const,
};

const PAGE_SIZE = 12;

export function usePublicFeed(destination: string, sort: PublicFeedSort = "latest") {
  return useInfiniteQuery({
    queryKey: exploreKeys.feed(destination, sort),
    queryFn: ({ pageParam }) => socialApi.getPublicFeed(pageParam, PAGE_SIZE, destination, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage: PublicFeedPage) =>
      lastPage.meta && !lastPage.meta.last ? lastPage.meta.page + 1 : undefined,
  });
}

export function usePublicTrip(tripId: number | null) {
  return useQuery({
    queryKey: exploreKeys.publicTrip(tripId ?? -1),
    queryFn: () => socialApi.getPublicTrip(tripId!),
    enabled: tripId != null,
  });
}

export function usePublishTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, isPublic }: { tripId: number; isPublic: boolean }) =>
      socialApi.publishTrip(tripId, isPublic),
    onSuccess: (_data, { tripId }) => {
      qc.invalidateQueries({ queryKey: ["myTrips"] });
      qc.invalidateQueries({ queryKey: ["tripDetail", tripId] });
      qc.invalidateQueries({ queryKey: ["publicFeed"] });
    },
  });
}

export function useLikeStatus(tripId: number | null, loggedIn: boolean) {
  return useQuery({
    queryKey: exploreKeys.likeStatus(tripId ?? -1),
    queryFn: () => socialApi.getLikeStatus(tripId!),
    enabled: tripId != null && loggedIn,
  });
}

/** Optimistic toggle like: cập nhật liked/likesCount ngay, rollback nếu lỗi. */
export function useToggleLike(tripId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => socialApi.toggleLike(tripId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: exploreKeys.likeStatus(tripId) });
      const previous = qc.getQueryData<{ liked: boolean; likesCount: number }>(exploreKeys.likeStatus(tripId));
      if (previous) {
        qc.setQueryData(exploreKeys.likeStatus(tripId), {
          liked: !previous.liked,
          likesCount: previous.likesCount + (previous.liked ? -1 : 1),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(exploreKeys.likeStatus(tripId), context.previous);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(exploreKeys.likeStatus(tripId), data);
    },
  });
}
