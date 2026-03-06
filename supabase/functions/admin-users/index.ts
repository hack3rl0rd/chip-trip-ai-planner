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

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list-users";

    // LIST USERS
    if (action === "list-users") {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const usersMap = new Map(authData.users.map(u => [u.id, u]));

      const { data: trips } = await supabase.from("trips").select("user_id");
      const tripCounts: Record<string, number> = {};
      (trips || []).forEach(t => { tripCounts[t.user_id] = (tripCounts[t.user_id] || 0) + 1; });

      const result = (profiles || []).map(p => {
        const authUser = usersMap.get(p.user_id);
        return {
          ...p,
          email: authUser?.email || null,
          last_sign_in: authUser?.last_sign_in_at || null,
          provider: authUser?.app_metadata?.provider || "email",
          email_confirmed: !!authUser?.email_confirmed_at,
          trip_count: tripCounts[p.user_id] || 0,
        };
      });

      return new Response(JSON.stringify({ users: result, total: result.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST TRIPS
    if (action === "list-trips") {
      const { data: trips, error } = await supabase
        .from("trips")
        .select("id, destination, user_id, created_at, travelers, budget_level, styles, start_date, end_date")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Get user emails
      const userIds = [...new Set((trips || []).map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      const result = (trips || []).map(t => ({
        ...t,
        user_name: profileMap.get(t.user_id) || "Unknown",
      }));

      return new Response(JSON.stringify({ trips: result, total: result.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE TRIP
    if (action === "delete-trip") {
      const body = await req.json();
      const { trip_id } = body;
      if (!trip_id) throw new Error("trip_id required");

      const { error } = await supabase.from("trips").delete().eq("id", trip_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ANALYTICS
    if (action === "analytics") {
      const { data: profiles } = await supabase.from("profiles").select("created_at");
      const { data: trips } = await supabase.from("trips").select("created_at, destination");

      // Registrations by day (last 30 days)
      const now = new Date();
      const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const regByDay: Record<string, number> = {};
      (profiles || []).forEach(p => {
        const d = new Date(p.created_at);
        if (d >= days30) {
          const key = d.toISOString().slice(0, 10);
          regByDay[key] = (regByDay[key] || 0) + 1;
        }
      });

      // Top destinations
      const destCounts: Record<string, number> = {};
      (trips || []).forEach(t => {
        destCounts[t.destination] = (destCounts[t.destination] || 0) + 1;
      });
      const topDestinations = Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Trips by day (last 30 days)
      const tripsByDay: Record<string, number> = {};
      (trips || []).forEach(t => {
        const d = new Date(t.created_at);
        if (d >= days30) {
          const key = d.toISOString().slice(0, 10);
          tripsByDay[key] = (tripsByDay[key] || 0) + 1;
        }
      });

      // Build 30-day chart data
      const chartData = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        chartData.push({
          date: key,
          registrations: regByDay[key] || 0,
          trips: tripsByDay[key] || 0,
        });
      }

      return new Response(JSON.stringify({
        chartData,
        topDestinations,
        totalUsers: (profiles || []).length,
        totalTrips: (trips || []).length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
