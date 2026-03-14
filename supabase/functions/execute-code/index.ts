import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONLINE_COMPILER_API_URL = "https://api.onlinecompiler.io/api/run-code-sync/";

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { compiler, code, input } = await req.json();

    if (!compiler || !code) {
      throw new Error("Compiler and code are required.");
    }

    // Try multiple possible environment variable names
    const API_KEY = Deno.env.get("ONLINE_COMPILER_API_KEY") || Deno.env.get("VITE_ONLINE_COMPILER_API_KEY");

    if (!API_KEY) {
      throw new Error("Online Compiler API Key is missing in Edge Function secrets.");
    }

    const payload = { compiler, code, input: input || "" };

    const response = await fetch(ONLINE_COMPILER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error executing code:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
