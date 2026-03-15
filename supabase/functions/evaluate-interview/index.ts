import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GROQ_API_KEY) {
      console.error("CRITICAL: GROQ_API_KEY missing in Supabase secrets");
      throw new Error("Groq API key is not configured in Supabase.");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("CRITICAL: Supabase internal credentials missing");
      throw new Error("Supabase credentials are not configured correctly.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch session data
    console.log(`DEBUG: Fetching session data for ID: ${session_id}`);
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error(`DEBUG: Failed to fetch session: ${sessionError?.message}`);
      throw new Error(`Failed to fetch session: ${sessionError?.message || 'Not found'}`);
    }

    const transcript = session.transcript || [];
    const interview_type = session.interview_type || 'voice';
    console.log(`DEBUG: Session found. Transcript length: ${transcript.length}, Type: ${interview_type}`);

    if (transcript.length === 0) {
      throw new Error("No transcript found for this session.");
    }

    const systemPrompt = `You are an expert technical interviewer and behavioral analyst. Your task is to evaluate a candidate's performance in a ${interview_type} interview based on the provided transcript.
    
    CRITICAL OBJECTIVE: You must provide a **nuanced, accurate, and EVIDENCE-BASED** assessment.
    
    **MANDATORY INSTRUCTION: USE QUOTES.**
    When providing feedback, strengths, or weaknesses, you MUST quote the candidate's exact words (or close paraphrase) to support your claim.

    - **AVOID GENERIC SCORES:** Do not just give everyone 70-80. Use the full range (0-100) based on merit.
    - **DETECT NUANCE:** A short answer can still demonstrate high IQ if it's precise. A long rambling answer might indicate low CQ (lack of focus).
    - **CONTEXT MATTERS:** This is a ${interview_type} interview.

    **STEP 1: SANITY CHECK (Pass/Fail)**
    - FAIL if the user is trolling, spamming keys ("asdf"), or refusing to participate.
    - **IF FAIL:** Return score: 0, and feedback: "Interview attempt invalid due to irrelevant or non-serious responses."

    **STEP 2: 6Q PERSONALITY FRAMEWORK (Scoring 0-100)**
    Analyze the candidate's specific word choices and problem-solving approach.
    IQ, EQ, CQ, AQ, SQ, MQ.

    **STEP 3: CLUSTER ASSIGNMENT**
    Assign a descriptive persona cluster name based on the scores.

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

    // 2. Format transcript for Groq
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...transcript.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || ""
      }))
    ];

    // 3. Call Groq API
    console.log("DEBUG: Calling Groq API (llama-3.3-70b-versatile)...");
    const startTime = Date.now();

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error(`DEBUG: Groq API Error (${groqResponse.status}):`, errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    console.log(`DEBUG: Groq responded in ${Date.now() - startTime}ms`);

    let aiContent = groqData.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error("No content received from Groq");
    }

    const evaluation = JSON.parse(aiContent);

    // 4. Update Database
    console.log("DEBUG: Updating interview session with results...");
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        overall_score: evaluation.score,
        feedback_summary: evaluation.feedback,
        whats_good: evaluation.strengths,
        whats_wrong: evaluation.weaknesses,
        six_q_score: evaluation.six_q_score,
        personality_cluster: evaluation.personality_cluster,
        status: 'completed'
      })
      .eq('id', session_id);

    if (updateError) {
      console.error("CRITICAL: Database update failed:", updateError);
      throw new Error(`Failed to save evaluation to database: ${updateError.message}`);
    }

    console.log("DEBUG: Database update successful.");

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
