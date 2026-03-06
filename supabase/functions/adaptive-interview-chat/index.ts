import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, skillGaps, userContext } = await req.json();

    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'messages' parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing 'userId' parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Adaptive interview request for user:", userId, "with", messages.length, "messages");

    // Environment variable validation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not configured");
    }

    if (!supabaseKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's interview history for context (non-critical, continue on error)
    const { data: pastSessions, error: pastSessionsError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (pastSessionsError) {
      console.error("Error fetching past sessions:", pastSessionsError);
    }

    const { data: videoSessions, error: videoSessionsError } = await supabase
      .from("video_interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    if (videoSessionsError) {
      console.error("Error fetching video sessions:", videoSessionsError);
    }

    // Build context-aware system prompt
    const safeSkillGaps = skillGaps || { note: "No specific skill gaps identified yet. Conduct a general assessment." };
    const systemPrompt = `You are an expert technical interviewer conducting an adaptive interview simulation. Your goal is to help the candidate improve their skills based on their identified gaps and verify their profile claims.

CANDIDATE PROFILE & CONTEXT:
${userContext || "No specific profile context provided."}

CANDIDATE'S SKILL GAPS:
${JSON.stringify(safeSkillGaps, null, 2)}

INTERVIEW HISTORY CONTEXT:
- Completed ${pastSessions?.length || 0} text interview sessions
- Completed ${videoSessions?.length || 0} video interview sessions
- Average video score: ${videoSessions && videoSessions.length > 0
        ? Math.round(videoSessions.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) / videoSessions.length)
        : "N/A"}

YOUR APPROACH:
1. **FIRST INTERACTION RULES**:
   - IF the user says "Start the interview..." or if this is the very first message:
   - YOU MUST ASK: "Tell me about yourself." (or a slight variation like "Let's start with an introduction. Tell me about yourself and your background.")
   - DO NOT evaluate the user's "Start" command. Just ask the question.

2. **SUBSEQUENT INTERACTIONS**:
   - Focus on the identified skill gaps systematically.
   - VERIFY PROFILE CLAIMS (GitHub, Resume, LeetCode).
   - Provide immediate feedback.

RESPONSE STRUCTURE (Strict JSON-like markdown):

### ✅ What You Did Well
[2-3 specific positive points]

### ⚠️ Areas to Improve
[2-3 specific improvements]

### 📝 Model Answer
[CRITICAL: Write a CONCISE, PERFECT EXAMPLE ANSWER in the FIRST PERSON ("I").]
[DO NOT write: "The candidate should mention..." or "A good answer would be..."]
[WRITE IT LIKE THIS: "To manage a project with tight deadlines, I would prioritize tasks based on impact and urgency, allocate resources efficiently, and maintain clear communication with stakeholders to ensure successful delivery."]
[Keep it to 2-3 sentences maximum. Be direct, specific, and actionable. Focus on the key approach/strategy, not lengthy explanations.]

### 🎯 Skill Gap Analysis
[Brief note on progress]

### ⚠️ Verification Note (ONLY include this section if the user mentioned a project, skill, or experience that is NOT found in their GitHub/Resume context above)
[Example: "I did not find any project named 'blockchain app' in your GitHub profile or resume. Please provide specific implementation details to verify this claim."]
[If everything they mentioned is verified in their profile, DO NOT include this section at all.]

### ❓ Next Question
[Your next adaptive question]

ADAPTIVE DIFFICULTY RULES:
- If they struggle with basics: Focus on fundamentals.
- If they show strength: Increase complexity.
- Always tie questions back to their specific skill gaps.

Keep your tone professional, encouraging, and educational.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits depleted. Please contact support.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ content }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in adaptive-interview-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
