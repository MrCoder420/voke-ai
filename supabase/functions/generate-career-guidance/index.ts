import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BedrockRuntimeClient, ConverseCommand } from "npm:@aws-sdk/client-bedrock-runtime";

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
    const { userId } = await req.json();
    console.log("Generating career guidance with Bedrock for user:", userId);

    const AWS_ACCESS_KEY_ID = Deno.env.get("BEDROCK_AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("BEDROCK_AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = Deno.env.get("BEDROCK_AWS_REGION") || "us-east-1";

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error("Bedrock AWS credentials are not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Get user's interview history and performance
    const { data: interviewSessions } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("user_id", userId);

    const { data: videoSessions } = await supabase
      .from("video_interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed");

    // Get current job market trends
    const { data: trends } = await supabase
      .from("job_market_trends")
      .select("*")
      .order("last_updated", { ascending: false })
      .limit(10);

    // Build context for AI
    const userContext = {
      profile: profile || {},
      interviewCount: interviewSessions?.length || 0,
      videoInterviewCount: videoSessions?.length || 0,
      averageVideoScore:
        videoSessions && videoSessions.length > 0
          ? Math.round(
            videoSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) /
            videoSessions.length
          )
          : null,
      recentTrends: trends || [],
    };

    const guidancePrompt = `You are a career counselor and interview preparation expert. Analyze this user's profile and performance data, then provide personalized career guidance.

USER DATA:
${JSON.stringify(userContext, null, 2)}

TASK: Provide comprehensive, personalized guidance in JSON format:
{
  "recommended_roles": [
    {
      "title": "Role title",
      "reason": "Why this role fits the user",
      "market_demand": "Current demand level"
    }
  ],
  "skill_gaps": [
    {
      "skill": "Skill name",
      "importance": "Why it matters",
      "learning_resource": "Suggested resource"
    }
  ],
  "learning_priorities": [
    {
      "priority": 1,
      "topic": "Topic to learn",
      "reason": "Why focus on this now",
      "timeline": "Suggested timeframe"
    }
  ],
  "preparation_roadmap": "A detailed 3-month preparation plan with weekly milestones",
  "market_insights": "Key insights about the current job market and how the user can position themselves"
}

Consider:
- User's current performance in interviews
- Gaps in their preparation based on interview history
- Current job market trends and demand
- Realistic skill development timeline
- Practical, actionable advice

Be specific, encouraging, and data-driven.`;

    const bedrock = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new ConverseCommand({
      modelId: "meta.llama3-3-70b-instruct-v1:0",
      messages: [
        {
          role: "user",
          content: [{ text: guidancePrompt }]
        }
      ],
      system: [{ text: "You are a career counselor and interview preparation expert." }],
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 4096,
      }
    });

    const data = await bedrock.send(command);
    const aiResponse = data.output?.message?.content?.[0]?.text;

    if (!aiResponse) {
      throw new Error("No response from Bedrock");
    }

    // Parse AI response
    let guidance;
    try {
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      guidance = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse guidance data");
    }

    // Store or update recommendations
    const { data: existing } = await supabase
      .from("user_career_recommendations")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase
        .from("user_career_recommendations")
        .update({
          recommended_roles: guidance.recommended_roles,
          skill_gaps: guidance.skill_gaps,
          learning_priorities: guidance.learning_priorities,
          preparation_roadmap: guidance.preparation_roadmap,
          market_insights: guidance.market_insights,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_career_recommendations").insert({
        user_id: userId,
        recommended_roles: guidance.recommended_roles,
        skill_gaps: guidance.skill_gaps,
        learning_priorities: guidance.learning_priorities,
        preparation_roadmap: guidance.preparation_roadmap,
        market_insights: guidance.market_insights,
      });
    }

    console.log("Successfully generated career guidance");

    return new Response(JSON.stringify({ success: true, guidance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-career-guidance function with Bedrock:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
