DROP POLICY IF EXISTS "Anyone can view trips by direct link" ON public.trips;
CREATE POLICY "Anyone can view trips by direct link" ON public.trips FOR SELECT TO anon, authenticated USING (true);