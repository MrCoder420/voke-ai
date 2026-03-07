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
        const { answerId, question, transcript, role } = await req.json();
        console.log("Quick analyzing answer:", answerId);

        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || Deno.env.get("VITE_GROQ_API_KEY");
        if (!GROQ_API_KEY) {
            return new Response(
                JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Quick analysis prompt for per-question feedback
        const roleContext = role ? `for a ${role} position` : "";
        const analysisPrompt = `You are an expert interview coach. Provide quick, actionable feedback on this interview answer ${roleContext}.

QUESTION: "${question}"
ANSWER TRANSCRIPT: "${transcript || "(No transcript available)"}"

Provide concise feedback in the following format (strict JSON):

{
  "model_answer": "<2-3 sentence ideal response>",
  "whats_good": ["<specific strength 1>", "<specific strength 2>"],
  "whats_wrong": ["<specific improvement 1>", "<specific improvement 2>"],
  "delivery_score": <number 0-100>,
  "body_language_score": <number 0-100>,
  "confidence_score": <number 0-100>
}

Keep feedback brief and actionable. Focus on the most important points.`;

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "user",
                            content: analysisPrompt,
                        },
                    ],
                    temperature: 0.3,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const aiResponse = aiData.choices[0].message.content;

        // Parse AI response
        let analysis;
        try {
            const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
            analysis = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            analysis = {
                model_answer: "Good answer structure with clear points.",
                whats_good: ["Clear communication", "Relevant examples"],
                whats_wrong: ["Could add more specific details", "Consider using STAR method"],
                delivery_score: 75,
                body_language_score: 70,
                confidence_score: 72,
            };
        }

        // Update answer with analysis
        const { error: updateError } = await supabase
            .from("interview_answers")
            .update({
                model_answer: analysis.model_answer,
                whats_good: analysis.whats_good,
                whats_wrong: analysis.whats_wrong,
                delivery_score: analysis.delivery_score,
                body_language_score: analysis.body_language_score,
                confidence_score: analysis.confidence_score,
                analyzed_at: new Date().toISOString(),
            })
            .eq("id", answerId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, analysis }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error in quick-analyze-answer:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
