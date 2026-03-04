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
        const { sessionId } = await req.json();
        console.log("Generating overall feedback for session with Bedrock:", sessionId);

        const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
        const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
        const AWS_REGION = Deno.env.get("AWS_REGION") || "us-east-1";

        if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
            return new Response(
                JSON.stringify({ error: "AWS credentials are not configured" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get session and all answers
        const { data: session, error: sessionError } = await supabase
            .from("interview_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (sessionError) throw sessionError;

        const { data: answers, error: answersError } = await supabase
            .from("interview_answers")
            .select("*")
            .eq("session_id", sessionId)
            .order("question_number");

        if (answersError) throw answersError;

        // Prepare answers summary for AI
        const answersSummary = answers.map((a, idx) => `
Question ${idx + 1}: ${a.question}
Transcript: ${a.transcript || "N/A"}
Scores: Delivery=${a.delivery_score}, Body Language=${a.body_language_score}, Confidence=${a.confidence_score}
`).join("\n");

        const analysisPrompt = `You are an expert interview coach. Analyze this complete interview session for a ${session.role} position.

INTERVIEW SUMMARY:
${answersSummary}

**6Q PERSONALITY ANALYSIS FRAMEWORK:**
   Analyze the candidate's personality traits (0-100) across all their answers based on the comprehensive "6Q Framework":

   **1. IQ (Intelligence Quotient)** - Problem solving, concept grasping, and logic
      High IQ Indicators: Academic performance, uses specific examples, asks counter-questions, minimal emotional expression
      Developing IQ Indicators: Unclear responses, changes topic often, rarely asks follow-ups, relies on emotions

   **2. EQ (Emotional Quotient)** - Emotional literacy, self-awareness, and empathy
      High EQ Indicators: Admits mistakes without defensiveness, uses emotional vocabulary, acknowledges strengths and struggles, values teamwork, takes pauses
      Developing EQ Indicators: Blames others, holds grudges, displays frustration quickly, seeks constant validation

   **3. CQ (Creativity Quotient)** - Finding new ways to look at questions
      High CQ Indicators: Asks diverse questions, uses "what if" thinking, associates concepts creatively, comfortable with trial and error
      Developing CQ Indicators: Uncomfortable with open-ended questions, prefers structured paths, rarely asks beyond task

   **4. AQ (Adversity Quotient)** - Handling pressure, setbacks, and uncertainty
      High AQ Indicators: Uses affirming gestures, talks about process not blame, clear reflection, calm tone, listens when corrected
      Developing AQ Indicators: Missing reflection, quickly blames, immediate defensiveness, quick frustration

   **5. SQ (Social Quotient)** - Connecting, collaborating, and building rapport
      High SQ Indicators: Adapts tone to audience, includes others, handles conflict maturely, understands non-verbal cues
      Developing SQ Indicators: Blames team, dominates or withdraws, focuses only on own ideas

   **6. MQ (Moral Quotient)** - Integrity, honesty, and fairness
      High MQ Indicators: Takes responsibility, acknowledges others' contributions, consistency across contexts, owns mistakes
      Developing MQ Indicators: Alters behavior based on audience, avoids reflection after conflicts

   **DETERMINE THE PERSONALITY CLUSTER based on the top 3 traits:**
   - Balanced Thinker (IQ+EQ+SQ), Innovative Problem Solver (IQ+CQ+AQ), Creative Strategist (IQ+CQ+SQ)
   - Resilient Scholar (IQ+EQ+AQ), Responsible Analyst (IQ+SQ+MQ), Compassionate Leader (EQ+SQ+MQ)
   - Creative People Person (EQ+CQ+SQ), Ethical Resilient Leader (EQ+AQ+MQ), Adaptive Innovator (CQ+AQ+SQ)
   - Socially Conscious Creator (CQ+SQ+MQ), Ethical Executor (IQ+MQ+AQ), Empathic Creator (EQ+CQ+MQ)
   - Insightful Innovator (IQ+EQ+CQ), Thoughtful Decision Maker (IQ+EQ+MQ), Creative Resilient Communicator (CQ+EQ+AQ)
   - Purpose-Led Problem Solver (MQ+CQ+AQ), High-Output Collaborator (IQ+SQ+AQ), The Stabiliser (EQ+SQ+AQ)

Provide comprehensive overall feedback in the following format (strict JSON):

{
  "body_language_summary": "<2-3 sentences on overall body language across all answers>",
  "eye_contact_summary": "<2-3 sentences on eye contact and camera engagement>",
  "confidence_summary": "<2-3 sentences on overall confidence and presence>",
  "overall_score": <number 0-100>,
  "key_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "key_improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "six_q_score": {
    "iq": <number 0-100>,
    "eq": <number 0-100>,
    "cq": <number 0-100>,
    "aq": <number 0-100>,
    "sq": <number 0-100>,
    "mq": <number 0-100>
  },
  "personality_cluster": "<Cluster Name>"
}

Focus on patterns across all answers, not individual questions.`;

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
                    content: [{ text: "Please analyze the interview session and provide the requested JSON feedback." }]
                }
            ],
            system: [{ text: analysisPrompt }],
            inferenceConfig: {
                temperature: 0.3,
                maxTokens: 4096,
            }
        });

        const data = await bedrock.send(command);
        const aiResponse = data.output?.message?.content?.[0]?.text;

        if (!aiResponse) {
            throw new Error("No response from AI");
        }

        // Parse AI response
        let analysis;
        try {
            const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
            analysis = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            // Calculate average scores
            const avgScore = Math.round(
                answers.reduce((sum, a) => sum + ((a.delivery_score + a.body_language_score + a.confidence_score) / 3), 0) / answers.length
            );
            analysis = {
                body_language_summary: "Maintained professional posture throughout the interview.",
                eye_contact_summary: "Good camera engagement with room for improvement.",
                confidence_summary: "Demonstrated confidence with clear communication.",
                overall_score: avgScore,
                key_strengths: ["Clear communication", "Professional demeanor", "Relevant examples"],
                key_improvements: ["Reduce filler words", "Improve eye contact", "Structure answers better"],
            };
        }

        // Update session with overall feedback
        const { error: updateError } = await supabase
            .from("interview_sessions")
            .update({
                body_language_summary: analysis.body_language_summary,
                eye_contact_summary: analysis.eye_contact_summary,
                confidence_summary: analysis.confidence_summary,
                overall_score: analysis.overall_score,
                status: "completed",
                six_q_score: analysis.six_q_score,
                personality_cluster: analysis.personality_cluster,
                completed_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, analysis }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error in generate-overall-feedback:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
