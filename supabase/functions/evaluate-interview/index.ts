import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { messages, interview_type } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

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
       - *High (80-100):* Answers are structured, logically sound, and directly address the core problem. Uses technical terminology correctly.
       - *Avg (50-79):* Generally correct but may lack depth or miss edge cases.
       - *Low (0-49):* Fundamentally incorrect, illogical, or unable to grasp the question.

    **2. EQ (Emotional Quotient)** - Self-Awareness, Tone, Empathy.
       - *High:* Uses phrases like "I believe," "In my experience," or "That's a good question." Admits gaps in knowledge gracefully ("I'm not sure about X, but...").
       - *Low:* Defensive, arrogant, or dismissive. abruptly changes topics.

    **3. CQ (Creativity Quotient)** - Innovation, "What If" Thinking.
       - *High:* Proposes alternative solutions. Asks insightful clarifying questions. connects unrelated concepts.
       - *Low:* Only gives the textbook answer. Stuck in one mode of thinking.

    **4. AQ (Adversity Quotient)** - Resilience, Handling Complexity.
       - *High:* Stays calm when faced with a hard question (e.g., "Let me think about that..."). breaks down complex problems systematically.
       - *Low:* Gives up immediately ("I don't know"). Becomes visibly frustrated or repetitive.

    **5. SQ (Social Quotient)** - Communication, Engagement.
       - *High:* Conversational, engaging tone. Uses clear signposting ("First I'll do X, then Y").
       - *Low:* Monosyllabic answers ("Yes", "No"). excessively formal or robotic.

    **6. MQ (Moral/Ethical Quotient)** - Integrity, Transparency.
       - *High:* Highlights trade-offs honestly. Doesn't bluff when they don't know. 
       - *Low:* Attempts to fake knowledge.

    **STEP 3: CLUSTER ASSIGNMENT**
    Based on the top 3 highest scores, assign a persona from the following list that BEST describes them:
    - Balanced Thinker (IQ+EQ+SQ)
    - Innovative Problem Solver (IQ+CQ+AQ)
    - Creative Strategist (IQ+CQ+SQ)
    - Resilient Scholar (IQ+EQ+AQ)
    - Responsible Analyst (IQ+SQ+MQ)
    - Compassionate Leader (EQ+SQ+MQ)
    - Creative People Person (EQ+CQ+SQ)
    - Ethical Resilient Leader (EQ+AQ+MQ)
    - Adaptive Innovator (CQ+AQ+SQ)
    - Socially Conscious Creator (CQ+SQ+MQ)
    - Ethical Executor (IQ+MQ+AQ)
    - Empathic Creator (EQ+CQ+MQ)
    - Insightful Innovator (IQ+EQ+CQ)
    - Thoughtful Decision Maker (IQ+EQ+MQ)
    - Creative Resilient Communicator (CQ+EQ+AQ)
    - Purpose-Led Problem Solver (MQ+CQ+AQ)
    - High-Output Collaborator (IQ+SQ+AQ)
    - The Stabiliser (EQ+SQ+AQ)

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
      "personality_cluster": "Cluster Name from list"
    }`;

    // Format messages for Groq
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

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
          messages: formattedMessages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    let aiContent = data.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content received from Groq");
    }

    // Clean up potential markdown formatting
    aiContent = aiContent.replace(/```json/g, "").replace(/```/g, "").trim();

    const evaluation = JSON.parse(aiContent);

    return new Response(JSON.stringify(evaluation), {
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
