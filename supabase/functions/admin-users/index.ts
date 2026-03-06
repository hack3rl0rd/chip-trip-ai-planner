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

    // Get calling user from auth header
    const authHeader = req.headers.get("Authorization");
    let callingUserId: string | null = null;
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      callingUserId = user?.id || null;
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list-users";

    // CHECK ROLE
    if (action === "check-role") {
      if (!callingUserId) {
        return new Response(JSON.stringify({ isAdmin: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callingUserId)
        .eq("role", "admin")
        .maybeSingle();

      return new Response(JSON.stringify({ isAdmin: !!data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- All actions below require admin role ---
    if (!callingUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper to log activity
    const logActivity = async (actionName: string, targetType: string, targetId?: string, details?: Record<string, unknown>) => {
      await supabase.from("admin_activity_logs").insert({
        admin_user_id: callingUserId,
        action: actionName,
        target_type: targetType,
        target_id: targetId || null,
        details: details || {},
      });
    };

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

      await logActivity("view_users", "users");

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

      await logActivity("delete_trip", "trip", trip_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ANALYTICS
    if (action === "analytics") {
      const { data: profiles } = await supabase.from("profiles").select("created_at");
      const { data: trips } = await supabase.from("trips").select("created_at, destination");

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

      const destCounts: Record<string, number> = {};
      (trips || []).forEach(t => {
        destCounts[t.destination] = (destCounts[t.destination] || 0) + 1;
      });
      const topDestinations = Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const tripsByDay: Record<string, number> = {};
      (trips || []).forEach(t => {
        const d = new Date(t.created_at);
        if (d >= days30) {
          const key = d.toISOString().slice(0, 10);
          tripsByDay[key] = (tripsByDay[key] || 0) + 1;
        }
      });

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

    // GET ACTIVITY LOGS
    if (action === "logs") {
      const { data: logs, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // Get admin names
      const adminIds = [...new Set((logs || []).map(l => l.admin_user_id).filter(Boolean))];
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", adminIds);
      const adminMap = new Map((adminProfiles || []).map(p => [p.user_id, p.display_name]));

      const result = (logs || []).map(l => ({
        ...l,
        admin_name: adminMap.get(l.admin_user_id) || "Unknown",
      }));

      return new Response(JSON.stringify({ logs: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST CONTENT
    if (action === "list-content") {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      return new Response(JSON.stringify({ content: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAVE CONTENT
    if (action === "save-content") {
      const body = await req.json();
      const { id, content_key, title, body: contentBody, image_url, is_active, metadata } = body;

      if (id) {
        const { error } = await supabase.from("site_content").update({
          title, body: contentBody, image_url, is_active, metadata,
          updated_by: callingUserId, updated_at: new Date().toISOString(),
        }).eq("id", id);
        if (error) throw error;
        await logActivity("update_content", "content", id, { content_key });
      } else {
        const { error } = await supabase.from("site_content").insert({
          content_key, title, body: contentBody, image_url, is_active, metadata,
          updated_by: callingUserId,
        });
        if (error) throw error;
        await logActivity("create_content", "content", content_key);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE CONTENT
    if (action === "delete-content") {
      const body = await req.json();
      const { content_id } = body;
      if (!content_id) throw new Error("content_id required");

      const { error } = await supabase.from("site_content").delete().eq("id", content_id);
      if (error) throw error;
      await logActivity("delete_content", "content", content_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
