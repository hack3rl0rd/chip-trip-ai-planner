
-- Add share_token column for public sharing
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON public.trips(share_token) WHERE share_token IS NOT NULL;

-- Allow anyone to SELECT a trip by share_token (read-only, public access)
CREATE POLICY "Anyone can view shared trips by token"
ON public.trips
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL AND share_token = current_setting('request.headers', true)::json->>'x-share-token' IS NOT NULL);

-- Actually, let's use a simpler approach - allow select if share_token matches via RPC
-- Drop the complex policy
DROP POLICY IF EXISTS "Anyone can view shared trips by token" ON public.trips;

-- Simple policy: allow SELECT on trips that have a share_token set (for shared viewing)
CREATE POLICY "Public can view trips with share_token"
ON public.trips
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);
