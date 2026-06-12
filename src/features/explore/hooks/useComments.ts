import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { socialApi } from "@/integrations/api";

export const commentKeys = {
  list: (tripId: number, page: number) => ["tripComments", tripId, page] as const,
  all: (tripId: number) => ["tripComments", tripId] as const,
};

export function useComments(tripId: number, page = 0) {
  return useQuery({
    queryKey: commentKeys.list(tripId, page),
    queryFn: () => socialApi.getComments(tripId, page),
  });
}

export function useAddComment(tripId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number | null }) =>
      socialApi.addComment(tripId, content, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.all(tripId) });
      qc.invalidateQueries({ queryKey: ["publicTrip", tripId] });
    },
  });
}

export function useDeleteComment(tripId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => socialApi.deleteComment(tripId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.all(tripId) });
      qc.invalidateQueries({ queryKey: ["publicTrip", tripId] });
    },
  });
}
