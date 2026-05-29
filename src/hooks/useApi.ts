import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi, userApi, authApi } from "@/integrations/api";
import type { GenerateTripPayload } from "@/integrations/api/modules/trips";
import type { UpdateProfilePayload } from "@/integrations/api/modules/user";

export const queryKeys = {
  myTrips: ["myTrips"] as const,
  tripDetail: (id: number) => ["tripDetail", id] as const,
  sharedTrip: (token: string) => ["sharedTrip", token] as const,
  myProfile: ["myProfile"] as const,
};

export function useMyTrips() {
  return useQuery({
    queryKey: queryKeys.myTrips,
    queryFn: () => tripsApi.getMyTrips(0, 50),
  });
}

export function useTripDetail(id: number | null) {
  return useQuery({
    queryKey: queryKeys.tripDetail(id ?? -1),
    queryFn: () => tripsApi.getTripDetail(id!),
    enabled: id != null,
  });
}

export function useSharedTrip(token: string | null) {
  return useQuery({
    queryKey: queryKeys.sharedTrip(token ?? ""),
    queryFn: () => tripsApi.getSharedTrip(token!),
    enabled: token != null,
  });
}

export function useGenerateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateTripPayload) => tripsApi.generate(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myTrips });
    },
  });
}

export function useCloneTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tripsApi.cloneTrip(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myTrips });
    },
  });
}

export function useEnableShare() {
  return useMutation({
    mutationFn: (id: number) => tripsApi.enableShare(id),
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tripsApi.deleteTrip(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myTrips });
    },
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: userApi.getMe,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateMe(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myProfile });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
  });
}
