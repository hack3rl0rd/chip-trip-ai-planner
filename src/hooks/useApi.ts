import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi, userApi, authApi, placesApi, membersApi, flightsApi } from "@/integrations/api";
import type { GenerateTripPayload } from "@/integrations/api/modules/trips";
import type { UpdateProfilePayload, ChangePasswordPayload } from "@/integrations/api/modules/user";
import type { AddMemberPayload, UpdateMemberPayload } from "@/integrations/api/modules/members";

export const queryKeys = {
  myTrips: ["myTrips"] as const,
  tripDetail: (id: number) => ["tripDetail", id] as const,
  sharedTrip: (token: string) => ["sharedTrip", token] as const,
  myProfile: ["myProfile"] as const,
  tripMembers: (tripId: number) => ["tripMembers", tripId] as const,
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

export function usePlaceDetail(id: number | null | undefined) {
  return useQuery({
    queryKey: ["placeDetail", id],
    queryFn: () => placesApi.getPlaceDetail(id!),
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

export function useTripFlights(tripId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["tripFlights", tripId],
    queryFn: () => flightsApi.getTripFlights(tripId!),
    enabled: enabled && tripId != null,
    staleTime: 60 * 60 * 1000, // giá vé đổi chậm — cache 1h ở client (BE cache 6h)
    retry: false,
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

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => userApi.changePassword(payload),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
  });
}

export function useTripMembers(tripId: number | null) {
  return useQuery({
    queryKey: queryKeys.tripMembers(tripId ?? -1),
    queryFn: () => membersApi.getMembers(tripId!),
    enabled: tripId != null,
  });
}

export function useAddMember(tripId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddMemberPayload) => membersApi.addMember(tripId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tripMembers(tripId) });
    },
  });
}

export function useUpdateMember(tripId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }: { memberId: number; payload: UpdateMemberPayload }) =>
      membersApi.updateMember(tripId, memberId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tripMembers(tripId) });
    },
  });
}

export function useRemoveMember(tripId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => membersApi.removeMember(tripId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tripMembers(tripId) });
    },
  });
}
