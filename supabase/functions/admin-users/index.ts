import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    // Get auth users for email info
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const usersMap = new Map(authData.users.map(u => [u.id, u]));

    const enrichedProfiles = (profiles || []).map(p => {
      const authUser = usersMap.get(p.user_id);
      return {
        ...p,
        email: authUser?.email || null,
        last_sign_in: authUser?.last_sign_in_at || null,
        provider: authUser?.app_metadata?.provider || "email",
        email_confirmed: !!authUser?.email_confirmed_at,
      };
    });

    // Get trip counts per user
    const { data: trips } = await supabase.from("trips").select("user_id");
    const tripCounts: Record<string, number> = {};
    (trips || []).forEach(t => {
      tripCounts[t.user_id] = (tripCounts[t.user_id] || 0) + 1;
    });

    const result = enrichedProfiles.map(p => ({
      ...p,
      trip_count: tripCounts[p.user_id] || 0,
    }));

    return new Response(JSON.stringify({ users: result, total: result.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
