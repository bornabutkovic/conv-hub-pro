import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  role: string;
  institution_id: string;
  first_name: string;
  last_name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is a super_admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check if caller is a super_admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || callerProfile?.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Only super admins can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, role, institution_id, first_name, last_name }: InviteUserRequest = await req.json();

    if (!email || !role || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, role, first_name, last_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["super_admin", "admin", "user"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the site URL for redirect
    const siteUrl = req.headers.get("origin") || "https://id-preview--908ddbac-4687-4971-b60a-0b5b5e488a13.lovable.app";

    // Invite user with metadata
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name,
        last_name,
        role,
        institution_uuid: institution_id || null,
      },
      redirectTo: `${siteUrl}/auth/update-password`,
    });

    if (error) {
      console.error("Error inviting user:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User invited successfully:", data.user?.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        user: { id: data.user?.id, email: data.user?.email }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
