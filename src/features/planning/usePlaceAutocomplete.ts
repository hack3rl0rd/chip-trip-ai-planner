import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { placesApi, type PlacePrediction } from "@/integrations/api";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Gọi /places/search qua TanStack Query, debounce 300ms để tránh bắn request mỗi keystroke.
 * Trả mảng rỗng khi query ngắn hơn MIN_QUERY_LENGTH (UX: chỉ search khi đủ ký tự).
 */
export function usePlaceAutocomplete(query: string, enabled = true): {
  predictions: PlacePrediction[];
  isLoading: boolean;
} {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const trimmed = debounced.trim();
  const shouldQuery = enabled && trimmed.length >= MIN_QUERY_LENGTH;

  const { data, isLoading } = useQuery({
    queryKey: ["places", "search", trimmed],
    queryFn: () => placesApi.searchPlaces(trimmed),
    enabled: shouldQuery,
    staleTime: 60_000,
  });

  return { predictions: shouldQuery ? data ?? [] : [], isLoading: shouldQuery && isLoading };
}
