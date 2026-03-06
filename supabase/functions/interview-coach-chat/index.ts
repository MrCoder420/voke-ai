
import { createClient } from "@supabase/supabase-js";

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
        const { messages, userContext } = await req.json();

        // Check for standard key first, then the user's custom named key
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || Deno.env.get("Groq NEW KEY");

        if (!GROQ_API_KEY) {
            console.error("Missing GROQ_API_KEY");
            throw new Error("Server configuration error: Missing API Key");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("No authorization header");
        }

        // Get user from token
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            throw new Error("Unauthorized");
        }

        const systemPrompt = `You are an expert interview coach with 15+ years of experience helping candidates succeed in technical interviews. You provide actionable, specific advice tailored to each individual.

${userContext ? `\n**USER CONTEXT:**\n${userContext}\n` : ""}

**YOUR ROLE:**
- Provide specific, actionable interview preparation advice
- Answer questions about interview strategies, techniques, and best practices
- Help with behavioral interview preparation (STAR method, storytelling)
- Offer tips on technical interview approaches (problem-solving, system design)
- Give feedback on interview answers and communication style
- Suggest practice exercises and resources

**GUIDELINES:**
- Be encouraging and supportive
- Provide concrete examples and frameworks
- Keep responses concise but comprehensive (2-4 paragraphs max)
- Use bullet points for lists
- Reference the user's context when relevant
- If asked about a specific company, provide tailored advice for that company's interview process

**TONE:** Professional, friendly, and motivating. Like a mentor who genuinely wants to help.`;

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
                    max_tokens: 1000,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API error:", response.status, errorText);
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content;

        if (!aiResponse) {
            throw new Error("No response from AI");
        }

        // Save or update chat session
        const { data: existingSession } = await supabase
            .from("chat_sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

        const updatedMessages = [
            ...(existingSession?.messages || []),
            ...messages.slice(-1), // Last user message
            { role: "assistant", content: aiResponse }
        ];

        if (existingSession) {
            await supabase
                .from("chat_sessions")
                .update({
                    messages: updatedMessages,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingSession.id);
        } else {
            await supabase
                .from("chat_sessions")
                .insert({
                    user_id: user.id,
                    messages: updatedMessages
                });
        }

        return new Response(JSON.stringify({ response: aiResponse }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in interview-coach-chat:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
