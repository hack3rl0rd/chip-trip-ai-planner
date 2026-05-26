
-- 1. Remove insecure trips SELECT policies
DROP POLICY IF EXISTS "Anyone can view trips by direct link" ON public.trips;
DROP POLICY IF EXISTS "Public can view trips with share_token" ON public.trips;

-- 2. Secure RPC to fetch a shared trip by exact token
CREATE OR REPLACE FUNCTION public.get_trip_by_share_token(_token text)
RETURNS TABLE (
  id uuid,
  destination text,
  start_date date,
  end_date date,
  travelers integer,
  budget_level integer,
  styles text[],
  trip_data jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.destination, t.start_date, t.end_date, t.travelers,
         t.budget_level, t.styles, t.trip_data, t.created_at
  FROM public.trips t
  WHERE t.share_token IS NOT NULL
    AND _token IS NOT NULL
    AND length(_token) >= 16
    AND t.share_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_trip_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trip_by_share_token(text) TO anon, authenticated;

-- 3. Storage: drop broad public listing policy on avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
-- Avatars bucket is public, so direct URLs via CDN still work without RLS.
-- Authenticated users can still read their own files for management:
CREATE POLICY "Users can view own avatar files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
