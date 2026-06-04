import { apiClient } from "../client";
import type { ApiResponse } from "../types";

export interface TripExpenseResponse {
  id: number;
  trip_id: number;
  paid_by: string;
  title: string;
  amount: number;
  category: string;
  split_among: string[];
  created_at: string;
}

export interface CreateTripExpenseRequest {
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  splitAmong: string[];
}

export const expensesApi = {
  getExpenses: async (tripId: number | string): Promise<TripExpenseResponse[]> => {
    const res = await apiClient.get<ApiResponse<TripExpenseResponse[]>>(
      `/trips/${tripId}/expenses`
    );
    return res.data.data;
  },

  createExpense: async (tripId: number | string, payload: CreateTripExpenseRequest): Promise<TripExpenseResponse> => {
    const res = await apiClient.post<ApiResponse<TripExpenseResponse>>(
      `/trips/${tripId}/expenses`,
      payload
    );
    return res.data.data;
  },

  deleteExpense: async (tripId: number | string, expenseId: number | string): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/expenses/${expenseId}`);
  },
};
