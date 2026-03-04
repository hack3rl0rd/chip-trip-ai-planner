-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view trip members" ON public.trip_members;

-- Create a security definer function to check membership without triggering RLS
CREATE OR REPLACE FUNCTION public.user_is_trip_member(_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members WHERE trip_id = _trip_id AND user_id = auth.uid()
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Members can view trip members"
ON public.trip_members
FOR SELECT
TO authenticated
USING (
  public.user_is_trip_member(trip_id)
  OR public.user_owns_trip(trip_id)
);