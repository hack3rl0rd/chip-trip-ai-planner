import apiClient from "../client";
import type { ApiResponse, PaymentOrder, PaymentPlan } from "../types";

export const paymentsApi = {
  listPlans: async (): Promise<PaymentPlan[]> => {
    const { data } = await apiClient.get<ApiResponse<PaymentPlan[]>>("/payments/plans");
    return data.data ?? [];
  },

  createOrder: async (planCode: string): Promise<PaymentOrder> => {
    const { data } = await apiClient.post<ApiResponse<PaymentOrder>>("/payments/orders", { planCode });
    return data.data;
  },

  getOrder: async (orderId: number): Promise<PaymentOrder> => {
    const { data } = await apiClient.get<ApiResponse<PaymentOrder>>(`/payments/orders/${orderId}`);
    return data.data;
  },
};
