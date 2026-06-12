export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  meta: unknown;
  timestamp: string;
}

/** PageMeta từ backend (common/response/PageMeta.java). */
export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type NotificationType =
  | "TRIP_MEMBER_ADDED"
  | "TRIP_REMINDER"
  | "AI_CREDITS_LOW"
  | "WEATHER_ALERT"
  | "SUPPORT_REPLY"
  | "NEW_SUPPORT_MESSAGE"
  | "TRIP_LIKED"
  | "TRIP_COMMENTED"
  | "POST_TRIP_REVIEW";

// ====== Chat (support) ======
export type ConversationStatus = "OPEN" | "CLOSED";
export type SenderRole = "USER" | "ADMIN";
export type MessageType = "TEXT" | "IMAGE";

export interface MessageDto {
  id: number;
  conversationId: number;
  senderRole: SenderRole;
  messageType: MessageType;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface ConversationDto {
  id: number;
  status: ConversationStatus;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface AdminConversationDto {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  refId: number | null;
  isRead: boolean;
  createdAt: string;
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

// ====== Payment (SePay) ======
export type OrderStatus = "PENDING" | "PAID";

export interface PaymentPlan {
  code: string;
  priceVnd: number;
  credits: number;
}

export interface PaymentOrder {
  orderId: number;
  orderCode: string;
  planCode: string;
  amountVnd: number;
  credits: number;
  status: OrderStatus;
  qrUrl: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferContent: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
}

export interface UserProfile {
  id: number;
  userId?: number;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  aiCredits: number;
  createdAt: string;
  role?: string;
  preferences?: string | null;
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
  imageUrl?: string | null;
  isPublic?: boolean | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  status?: TripLifecycleStatus | null;
}

export type TripLifecycleStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

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
  placeCacheId?: number | null;
  address?: string | null;
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

export interface TripMemberResponse {
  id: number;
  userId: number | null;
  displayName: string;
  avatarUrl: string | null;
  role: "OWNER" | "MEMBER";
  createdAt: string;
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
  isPublic?: boolean | null;
  publishedAt?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  status?: TripLifecycleStatus | null;
  user?: { id: number; email: string; fullName: string | null; avatarUrl: string | null } | null;
  members: TripMemberResponse[];
  days: DayDetail[];
  checklist: ChecklistDetail[];
}

export type TripGenerateResponse = TripDetail;

export interface ShareTokenResponse {
  shareToken: string;
}
