import apiClient from "../client";
import type { ApiResponse } from "../types";

export interface FlightLeg {
  airline: string | null;
  airlineLogo: string | null;
  departureAirport: string | null;
  departureTime: string | null;
  arrivalAirport: string | null;
  arrivalTime: string | null;
  durationMinutes: number | null;
  stops: number | null;
}

export interface FlightBookingOption {
  source: string | null;
  priceVnd: number | null;
  bookingLink: string | null;
}

export interface FlightSuggestion {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  returnDate: string | null;
  adults: number | null;
  totalPriceVnd: number | null;
  outbound: FlightLeg | null;
  returnLeg: FlightLeg | null;
  bookingOptions: FlightBookingOption[];
  googleFlightsUrl: string;
}

export const flightsApi = {
  /** Gợi ý chuyến bay cho 1 trip (điểm đi → điểm đến, ngày, số khách). */
  getTripFlights: async (tripId: number) => {
    const { data } = await apiClient.get<ApiResponse<FlightSuggestion>>(`/trips/${tripId}/flights`);
    return data.data;
  },
};
