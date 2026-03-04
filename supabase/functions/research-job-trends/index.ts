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
    const { category } = await req.json();
    console.log("Researching job trends with Bedrock for category:", category);

    const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = Deno.env.get("AWS_REGION") || "us-east-1";

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error("AWS credentials are not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Research prompt for job market trends
    const researchPrompt = `You are a career market analyst. Research and provide current job market trends for "${category}" roles in the tech industry.

Provide a comprehensive analysis in JSON format with:
{
  "trends": [
    {
      "title": "Trend title",
      "description": "Detailed description of the trend",
      "trending_skills": ["skill1", "skill2", "skill3"],
      "salary_range": "e.g., $80k-$150k",
      "demand_level": "high/medium/low",
      "growth_rate": "e.g., +15% YoY",
      "key_companies": ["Company1", "Company2", "Company3"],
      "preparation_tips": [
        "Specific actionable tip 1",
        "Specific actionable tip 2",
        "Specific actionable tip 3"
      ]
    }
  ]
}

Focus on:
- Current market demand and hiring trends
- Most sought-after skills and technologies
- Salary ranges for different experience levels
- Growing companies hiring for these roles
- Practical preparation advice for interviews

Base your analysis on current 2024-2025 tech market conditions.`;

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
          content: [{ text: researchPrompt }]
        }
      ],
      system: [{ text: "You are a career market analyst. Always respond with valid JSON." }],
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 4096,
      }
    });

    const data = await bedrock.send(command);
    const aiResponse = data.output?.message?.content?.[0]?.text;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Parse AI response
    let trendsData;
    try {
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      trendsData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse trends data");
    }

    // Store trends in database
    const trendsToInsert = trendsData.trends.map((trend: any) => ({
      category,
      title: trend.title,
      description: trend.description,
      trending_skills: trend.trending_skills,
      salary_range: trend.salary_range,
      demand_level: trend.demand_level,
      growth_rate: trend.growth_rate,
      key_companies: trend.key_companies,
      preparation_tips: trend.preparation_tips,
      last_updated: new Date().toISOString(),
    }));

    // Delete old trends for this category
    await supabase
      .from("job_market_trends")
      .delete()
      .eq("category", category);

    // Insert new trends
    const { error: insertError } = await supabase
      .from("job_market_trends")
      .insert(trendsToInsert);

    if (insertError) throw insertError;

    console.log("Successfully updated job market trends");

    return new Response(
      JSON.stringify({ success: true, trends: trendsToInsert }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in research-job-trends function:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
