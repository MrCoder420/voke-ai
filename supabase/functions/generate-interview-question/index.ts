import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, interview_type, question_count, coding_stats, profile_context } = await req.json();

    // ALWAYS return the introduction question as the first question
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          question: "Welcome! Let's begin with a classic interview question: Tell me about yourself.",
          is_finished: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || Deno.env.get("VITE_GROQ_API_KEY");
    console.log("DEBUG: GROQ_API_KEY present:", !!GROQ_API_KEY);
    console.log("DEBUG: GROQ_API_KEY length:", GROQ_API_KEY ? GROQ_API_KEY.length : 0);

    if (!GROQ_API_KEY) {
      console.error("CRITICAL: GROQ_API_KEY is missing from Supabase environment variables");
      throw new Error("GROQ_API_KEY is not configured in Supabase. Please run: supabase secrets set GROQ_API_KEY=your_key");
    }

    // Check if interview should end
    if (question_count >= 5) {
      return new Response(
        JSON.stringify({
          question: "Thank you for your time. We have completed the interview questions. Please click the 'Complete Interview' button to finish the session.",
          is_finished: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let statsContext = "";
    if (coding_stats) {
      const cfRating = coding_stats.codeforces?.rating;
      const lcSolved = coding_stats.leetcode?.submitStats?.find((s: any) => s.difficulty === "All")?.count;

      if (cfRating || lcSolved) {
        statsContext += `\n    CODING PROFILE:\n`;
        if (cfRating) statsContext += `    - Codeforces Rating: ${cfRating} (Adjust difficulty accordingly)\n`;
        if (lcSolved) statsContext += `    - LeetCode Problems Solved: ${lcSolved}\n`;
      }
    }

    if (profile_context) {
      statsContext += `\n    RESUME & GITHUB CONTEXT:\n${profile_context}\n`;
    }

    const systemPrompt = `You are an expert technical interviewer conducting a ${interview_type} interview.${statsContext}
    
    CRITICAL VERIFICATION RULES:
    1. **IMMEDIATELY CALL OUT LIES**: If the candidate claims a project/skill NOT in their GitHub/Resume context above, you MUST:
       - State clearly in verification_note: "I did not find any project named '[project name]' in your GitHub profile or resume."
       - Challenge them directly: "Can you provide specific implementation details to verify this claim?"
       - Be skeptical of vague answers
    
    2. **VERIFIED vs UNVERIFIED**:
       - ✅ VERIFIED: Projects/skills explicitly listed in the GitHub/Resume context above
       - ❌ UNVERIFIED: Anything the candidate mentions that is NOT in the context
       - For UNVERIFIED claims, ALWAYS add a verification_note calling it out
    
    3. **Cross-reference EVERYTHING**:
       - GitHub projects listed above = VERIFIED
       - Resume content above = VERIFIED
       - LeetCode/Codeforces stats above = VERIFIED
       - Anything else = UNVERIFIED (call it out!)
    
    RESPONSE FORMAT:
    
    **CRITICAL: You MUST respond with valid JSON only.**
    
    **For the FIRST message (no history):**
    {
      "question": "Welcome! Let's begin with a classic interview question: Tell me about yourself.",
      "is_finished": false
    }
    
    **For SUBSEQUENT messages (after user answers):**
    You MUST provide detailed feedback on their previous answer, then ask the next question.
    {
      "feedback": {
        "what_went_well": ["Specific point 1", "Specific point 2"],
        "what_needs_improvement": ["Specific issue 1", "Specific issue 2"],
        "model_answer": "Provide a CONCISE, PERFECT ANSWER (2-3 sentences maximum) to the question you asked. Write it as if you are the perfect candidate answering the question in first person. Be direct and actionable, focusing on the key approach/strategy without lengthy explanations. Example: 'To manage a project with tight deadlines, I would prioritize tasks based on impact and urgency, allocate resources efficiently, and maintain clear communication with stakeholders to ensure successful delivery.'",
        "verification_note": "OPTIONAL - Only include if they mentioned a project/skill/experience NOT found in their GitHub/Resume context. Format: 'I did not find any project/skill named [X] in your GitHub profile or resume. Please provide specific implementation details to verify this claim.' If everything is verified, omit this field entirely."
      },
      "question": "Your next question based on their performance",
      "is_finished": false
    }
    
    FEEDBACK GUIDELINES:
    - Be specific and constructive
    - ALWAYS check claims against GitHub/Resume context
    - Call out discrepancies immediately and directly
    - Model answer should be the ACTUAL perfect answer (3-5 sentences minimum), written as if you're the candidate
    - Adjust next question difficulty based on their performance
    
    VERIFICATION EXAMPLES:
    - ✅ User says "I worked on the React dashboard" AND it's in their GitHub → No verification_note needed
    - ❌ User says "I built a blockchain app" but it's NOT in GitHub → verification_note: "I did not find any blockchain project in your GitHub profile or resume. Please provide specific implementation details."
    - ❌ User says "I know Kubernetes" but it's not in resume/GitHub → verification_note: "I did not find Kubernetes mentioned in your resume or GitHub projects. Can you explain where you used it?"
    
    Keep questions concise but feedback detailed. BE STRICT about verification.`;

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
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      console.error("Request details:", {
        interview_type,
        question_count,
        has_coding_stats: !!coding_stats,
        has_profile_context: !!profile_context,
        message_count: messages?.length || 0
      });
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let aiContent = data.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content received from Groq");
    }

    // Clean up potential markdown formatting
    aiContent = aiContent.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(aiContent);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-interview-question:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        details: "Check edge function logs for more information"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
