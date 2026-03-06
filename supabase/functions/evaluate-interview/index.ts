import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { BedrockRuntimeClient, ConverseCommand } from "npm:@aws-sdk/client-bedrock-runtime";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("session_id is required");
    }

    const AWS_ACCESS_KEY_ID = Deno.env.get("BEDROCK_AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("BEDROCK_AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = Deno.env.get("BEDROCK_AWS_REGION") || "us-east-1";
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error("Bedrock AWS credentials are not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials are not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to fetch session: ${sessionError?.message || 'Not found'}`);
    }

    const transcript = session.transcript || [];
    const interview_type = session.interview_type || 'voice';

    const systemPrompt = `You are an expert technical interviewer and behavioral analyst. Your task is to evaluate a candidate's performance in a ${interview_type} interview based on the provided transcript.
    
    CRITICAL OBJECTIVE: You must provide a **nuanced, accurate, and EVIDENCE-BASED** assessment.
    
    **MANDATORY INSTRUCTION: USE QUOTES.**
    When providing feedback, strengths, or weaknesses, you MUST quote the candidate's exact words (or close paraphrase) to support your claim.
    - *Bad Feedback:* "You have good communication skills."
    - *Good Feedback:* "You demonstrated excellent communication when you said 'I would break this down into three parts', showing clear structural thinking."

    - **AVOID GENERIC SCORES:** Do not just give everyone 70-80. Use the full range (0-100) based on merit.
    - **DETECT NUANCE:** A short answer can still demonstrate high IQ if it's precise. A long rambling answer might indicate low CQ (lack of focus).
    - **CONTEXT MATTERS:** This is a ${interview_type} interview. Informal spoken grammar is acceptable, but technical accuracy and clarity are paramount.

    **STEP 1: SANITY CHECK (Pass/Fail)**
    - FAIL if the user is trolling, spamming keys ("asdf"), or refusing to participate.
    - FAIL if the user provides consistently irrelevant answers (e.g., answering "I like pizza" to a coding question).
    - **IF FAIL:** Return score: 0, and feedback: "Interview attempt invalid due to irrelevant or non-serious responses."

    **STEP 2: 6Q PERSONALITY FRAMEWORK (Scoring 0-100)**
    Analyze the candidate's specific word choices, tone indicators (if transcribed), and problem-solving approach.
    
    **1. IQ (Intelligence Quotient)** - Logic, Depth, Precision.
    **2. EQ (Emotional Quotient)** - Self-Awareness, Tone, Empathy.
    **3. CQ (Creativity Quotient)** - Innovation, "What If" Thinking.
    **4. AQ (Adversity Quotient)** - Resilience, Handling Complexity.
    **5. SQ (Social Quotient)** - Communication, Engagement.
    **6. MQ (Moral/Ethical Quotient)** - Integrity, Transparency.

    **STEP 3: CLUSTER ASSIGNMENT**
    Based on the top 3 highest scores, assign a descriptive persona cluster name.

    **OUTPUT SCHEMA (JSON Only):**
    {
      "score": number (0-100),
      "feedback": "Detailed summary (3-4 sentences) explicitly quoting the user's best/worst moments.",
      "strengths": ["Strength 1 (with quote)", "Strength 2 (with quote)", "Strength 3 (with quote)"],
      "weaknesses": ["Weakness 1 (with quote)", "Weakness 2 (with quote)", "Weakness 3 (with quote)"],
      "metrics": {
        "technical_accuracy": number (0-100),
        "communication": number (0-100),
        "problem_solving": number (0-100)
      },
      "six_q_score": {
        "iq": number, "eq": number, "cq": number, "aq": number, "sq": number, "mq": number
      },
      "personality_cluster": "Cluster Name"
    }`;

    // Format transcript for Bedrock
    const bedrockMessages = transcript.map((m: any) => ({
      role: m.role,
      content: [{ text: m.text }]
    }));

    const bedrock = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new ConverseCommand({
      modelId: "meta.llama3-3-70b-instruct-v1:0",
      messages: bedrockMessages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        temperature: 0.3,
        maxTokens: 4096,
      }
    });

    const data = await bedrock.send(command);
    const aiContent = data.output?.message?.content?.[0]?.text;

    if (!aiContent) {
      throw new Error("No response from Bedrock");
    }

    // Clean up potential markdown formatting
    const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
    const evaluation = JSON.parse(jsonStr.trim());

    // Update database
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        overall_score: evaluation.score,
        feedback_summary: evaluation.feedback,
        whats_good: evaluation.strengths,
        whats_wrong: evaluation.weaknesses,
        delivery_score: evaluation.metrics.communication,
        confidence_score: evaluation.metrics.technical_accuracy,
        six_q_score: evaluation.six_q_score,
        personality_cluster: evaluation.personality_cluster,
        status: 'completed'
      })
      .eq('id', session_id);

    if (updateError) {
      console.error("Database update error:", updateError);
    }

    return new Response(JSON.stringify({ success: true, evaluation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in evaluate-interview function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
