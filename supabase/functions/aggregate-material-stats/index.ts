import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await supabase.rpc("aggregate_material_stats")

  if (error) {
    console.error("[aggregate-material-stats]", error)

    return new Response(
      JSON.stringify({
        error: "Material statistics aggregation failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Material statistics aggregated successfully",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  )
})
