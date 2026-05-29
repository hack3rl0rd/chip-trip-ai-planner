export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  meta: unknown;
  timestamp: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  userId: number;
  email: string;
  fullName: string | null;
  role: string;
}

export interface UserProfile {
  userId: number;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  aiCredits: number;
  createdAt: string;
  role?: string;
}

export interface TripSummary {
  id: number;
  title: string;
  destination: string;
  dateStart: string | null;
  dateEnd: string | null;
  createdAt: string;
  updatedAt: string;
  totalCostVnd?: number | null;
  peopleCount: number | null;
  styles: string | null;
}

export interface ActivityDetail {
  id: number;
  startTime: string;
  name: string;
  description: string;
  type: string;
  costVnd: number;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  bookingUrl: string | null;
  displayOrder: number;
}

export interface DayDetail {
  id: number;
  dayNumber: number;
  date: string;
  dayCostVnd: number;
  activities: ActivityDetail[];
}

export interface ChecklistDetail {
  id: number;
  category: string;
  name: string;
  isChecked: boolean;
  displayOrder: number;
}

export interface TripDetail {
  id: number;
  title: string;
  departure: string | null;
  destination: string;
  dateStart: string | null;
  dateEnd: string | null;
  peopleCount: number | null;
  budgetVnd: number | null;
  styles: string | null;
  createdAt: string;
  updatedAt: string;
  totalCostVnd: number | null;
  shareToken: string | null;
  days: DayDetail[];
  checklist: ChecklistDetail[];
}

export interface TripGenerateResponse extends TripDetail {}

export interface ShareTokenResponse {
  shareToken: string;
}
