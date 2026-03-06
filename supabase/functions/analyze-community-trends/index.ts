import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BedrockRuntimeClient, ConverseCommand } from "npm:@aws-sdk/client-bedrock-runtime";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AWS_ACCESS_KEY_ID = Deno.env.get("BEDROCK_AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("BEDROCK_AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = Deno.env.get("BEDROCK_AWS_REGION") || "us-east-1";

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error("Bedrock AWS credentials are not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent posts (last 50)
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("content, tags, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) {
      throw postsError;
    }

    const postsText = posts.map(p => `- ${p.content} (Tags: ${p.tags?.join(', ')})`).join("\n");

    const systemPrompt = `You are a Community Manager AI for a tech interview preparation platform. 
    Analyze the following recent community posts and extract:
    1. Top 5 trending topics/hashtags based on frequency and relevance.
    2. 3 suggested community events that would be valuable to these users based on their discussions.

    Return the response in strictly valid JSON format with this structure:
    {
      "trending_topics": [
        { "tag": "TopicName", "posts": "Estimated count or relevance score" }
      ],
      "suggested_events": [
        { "title": "Event Title", "description": "Short description", "type": "Workshop/Mock Interview/etc" }
      ]
    }
    
    Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.`;

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
          content: [{ text: `Here are the recent posts:\n${postsText}` }]
        }
      ],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 4096,
      }
    });

    const data = await bedrock.send(command);
    let aiContent = data.output?.message?.content?.[0]?.text;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    // Clean up markdown if present
    const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
    const content = jsonStr.trim();

    return new Response(
      content,
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in analyze-community-trends function with Bedrock:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
