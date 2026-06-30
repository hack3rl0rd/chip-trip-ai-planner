import apiClient from "../client";
import type {
  ApiResponse,
  ActivityDetail,
  ChecklistCategory,
  ChecklistDetail,
  TripDetail,
  TripGenerateResponse,
  TripSummary,
  ShareTokenResponse,
} from "../types";

export interface GenerateTripPayload {
  departure: string;
  destination: string;
  tripType: "roundtrip" | "oneway";
  startDate: string;
  endDate: string;
  departureTime: string;
  returnTime: string;
  budgetVnd: number;
  styles: string[];
  peopleCount: number;
  tickets: number;
}

export interface ChecklistItemPayload {
  name: string;
  category: ChecklistCategory;
}

export type ActivityAlternativeCategory =
  | "RESTAURANT"
  | "HOTEL"
  | "ATTRACTION"
  | "CAFE"
  | "TRANSPORT";

export interface ActivityAlternativeOption {
  optionId: string;
  name: string;
  description: string | null;
  type: string;
  costVnd: number | null;
  searchQuery: string | null;
  reason: string | null;
  placeCacheId: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  bookingUrl: string | null;
  openState: string | null;
}

export interface ActivityAlternativesResponse {
  sessionId: number | null;
  category: ActivityAlternativeCategory | null;
  freeSwapsRemaining: number;
  chargeUnitsIfApplied: number;
  chargeCreditsIfApplied: number;
  options: ActivityAlternativeOption[];
}

export interface ReplaceActivityResponse {
  activity: ActivityDetail;
  freeSwapsRemaining: number;
  chargedUnits: number;
  chargedCredits: number;
  aiCreditUnitsRemaining: number | null;
  aiCreditBalance: number | null;
}

export const tripsApi = {
  generate: async (
    payload: GenerateTripPayload
  ): Promise<TripGenerateResponse & { geocodeFailedCount?: number | null }> => {
    const { data } = await apiClient.post<
      ApiResponse<TripGenerateResponse & { geocodeFailedCount?: number | null }>
    >("/trips/generate", payload, {
      // PHẢI lớn hơn worst-case của BE (model pro): LLM 90s × (1+max-retries) + geocode ~60s ≈ 240s.
      // Nếu client timeout sớm hơn BE, BE vẫn persist trip + trừ credit → user thấy "lỗi mà vẫn mất lượt".
      // Đợi đủ lâu để luôn nhận kết quả cuối: trừ credit ⇔ thực sự nhận được lịch trình.
      timeout: 270_000,
    });
    return data.data;
  },

  /**
   * Sinh lịch trình BẤT ĐỒNG BỘ: BE trả 202 ngay, việc nặng chạy nền, kết quả đẩy về qua
   * WebSocket (/user/queue/trip-generation). Chỉ chờ phần validate đồng bộ (402/400/429) ở đây.
   */
  generateAsync: async (payload: GenerateTripPayload): Promise<void> => {
    await apiClient.post<ApiResponse<void>>("/trips/generate-async", payload, {
      timeout: 30_000,
    });
  },

  getMyTrips: async (page = 0, size = 20) => {
    const { data } = await apiClient.get<ApiResponse<TripSummary[]>>("/trips", {
      params: { page, size },
    });
    return data.data;
  },

  getTripDetail: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<TripDetail>>(`/trips/${id}`);
    return data.data;
  },

  updateTrip: async (id: number, payload: Partial<TripDetail>) => {
    const { data } = await apiClient.patch<ApiResponse<TripDetail>>(`/trips/${id}`, payload);
    return data.data;
  },

  deleteTrip: async (id: number) => {
    await apiClient.delete(`/trips/${id}`);
  },

  deleteActivity: async (tripId: number, dayId: number, activityId: number) => {
    await apiClient.delete(`/trips/${tripId}/days/${dayId}/activities/${activityId}`);
  },

  reorderActivities: async (tripId: number, dayId: number, orderedIds: number[]) => {
    await apiClient.post(`/trips/${tripId}/days/${dayId}/activities/reorder`, { orderedIds });
  },

  getChecklist: async (tripId: number) => {
    const { data } = await apiClient.get<ApiResponse<ChecklistDetail[]>>(`/trips/${tripId}/checklist`);
    return data.data;
  },

  addChecklistItem: async (tripId: number, payload: ChecklistItemPayload) => {
    const { data } = await apiClient.post<ApiResponse<ChecklistDetail>>(`/trips/${tripId}/checklist`, payload);
    return data.data;
  },

  updateChecklistItem: async (tripId: number, itemId: number, payload: Partial<ChecklistItemPayload>) => {
    const { data } = await apiClient.patch<ApiResponse<ChecklistDetail>>(
      `/trips/${tripId}/checklist/${itemId}`,
      payload
    );
    return data.data;
  },

  toggleChecklistItem: async (tripId: number, itemId: number) => {
    const { data } = await apiClient.patch<ApiResponse<ChecklistDetail>>(`/trips/${tripId}/checklist/${itemId}/toggle`);
    return data.data;
  },

  deleteChecklistItem: async (tripId: number, itemId: number) => {
    await apiClient.delete(`/trips/${tripId}/checklist/${itemId}`);
  },

  createActivityAlternatives: async (
    tripId: number,
    dayId: number,
    activityId: number,
    payload: { category: ActivityAlternativeCategory; limit?: number }
  ) => {
    const { data } = await apiClient.post<ApiResponse<ActivityAlternativesResponse>>(
      `/trips/${tripId}/days/${dayId}/activities/${activityId}/alternatives`,
      payload,
      { timeout: 120_000 }
    );
    return data.data;
  },

  getActivityAlternatives: async (
    tripId: number,
    dayId: number,
    activityId: number
  ) => {
    const { data } = await apiClient.get<ApiResponse<ActivityAlternativesResponse>>(
      `/trips/${tripId}/days/${dayId}/activities/${activityId}/alternatives`
    );
    return data.data;
  },

  replaceActivity: async (
    tripId: number,
    dayId: number,
    activityId: number,
    payload: { sessionId: number; optionId: string }
  ) => {
    const { data } = await apiClient.post<ApiResponse<ReplaceActivityResponse>>(
      `/trips/${tripId}/days/${dayId}/activities/${activityId}/replace`,
      payload
    );
    return data.data;
  },

  cloneTrip: async (id: number) => {
    const { data } = await apiClient.post<ApiResponse<TripDetail>>(`/trips/${id}/clone`);
    return data.data;
  },

  enableShare: async (id: number) => {
    const { data } = await apiClient.post<ApiResponse<ShareTokenResponse>>(`/trips/${id}/share`);
    return data.data;
  },

  disableShare: async (id: number) => {
    await apiClient.delete(`/trips/${id}/share`);
  },

  getSharedTrip: async (shareToken: string) => {
    const { data } = await apiClient.get<ApiResponse<TripDetail>>(`/trips/shared/${shareToken}`);
    return data.data;
  },

  downloadPdf: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/trips/${id}/export/pdf`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
