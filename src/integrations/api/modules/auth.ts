import apiClient from "../client";
import type { ApiResponse, AuthResponse } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface SendOtpPayload {
  email: string;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
}

export interface ResetPasswordWithOtpPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", payload);
    return data.data;
  },

  register: async (payload: RegisterPayload) => {
    await apiClient.post<ApiResponse<void>>("/auth/register", payload);
  },

  logout: async () => {
    await apiClient.post<ApiResponse<void>>("/auth/logout");
  },

  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/refresh", { refreshToken });
    return data.data;
  },

  forgotPassword: async (email: string) => {
    await apiClient.post<ApiResponse<void>>("/auth/forgot-password", { email });
  },

  googleLogin: async (idToken: string) => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/google", { idToken });
    return data.data;
  },

  sendOtp: async (payload: SendOtpPayload) => {
    await apiClient.post<ApiResponse<void>>("/auth/send-otp", payload);
  },

  verifyOtp: async (payload: VerifyOtpPayload) => {
    await apiClient.post<ApiResponse<void>>("/auth/verify-otp", payload);
  },

  resetPasswordWithOtp: async (payload: ResetPasswordWithOtpPayload) => {
    await apiClient.post<ApiResponse<void>>("/auth/reset-password-with-otp", payload);
  },
};
