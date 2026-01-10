
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
        const { resumeText } = await req.json();

        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
        if (!GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is not configured");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("No authorization header");
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            throw new Error("Unauthorized");
        }

        if (!resumeText || resumeText.length < 50) {
            throw new Error("Resume content is missing or too short");
        }

        console.log(`Parsing resume text length: ${resumeText.length}`);

        const systemPrompt = `You are an expert resume parser. Your job is to extract structured data from raw resume text.
        You must return a JSON object that strictly matches the following TypeScript interfaces:

        interface Experience {
          id: string; // Use a random string
          role: string;
          company: string;
          duration: string;
          description: string;
        }

        interface Education {
          id: string; // Use a random string
          degree: string;
          school: string;
          year: string;
          coursework: string;
          location: string;
        }

        interface Project {
          id: string; // Use a random string
          name: string;
          description: string;
          link: string;
        }

        interface Leadership {
          id: string; // Use a random string
          type: 'Leadership' | 'Hackathon' | 'Certificate';
          role: string;
          organization: string;
          duration: string;
          description: string;
        }

        interface ResumeData {
          fullName: string;
          email: string;
          phone: string;
          location: string;
          linkedin: string;
          github: string;
          website: string;
          leetcode: string;
          codeforces: string;
          summary: string;
          skills: string; // Comma separated string
          experience: Experience[];
          education: Education[];
          projects: Project[];
          leadership: Leadership[];
        }

        IMPORTANT:
        - Extract the FULL NAME accurately. If the name is split across lines, join it.
        - Capture ALL bullet points for projects and experience. Do not summarize or truncate.
        - Format "description" fields as a string with bullet points separated by newlines (\`\\n\`). Do NOT return a single paragraph.
        - Look for "Links on page" sections at the bottom of pages to find URLs for LinkedIn, GitHub, etc., and map them ensuring they are valid URLs.
        - If a field is not found, use an empty string "" or empty array [].
        - Infer 'type' for leadership based on context (default to 'Leadership').
        - Ensure arrays are never null.
        - Do not include explanation, only the JSON.
        - Preserve original text formatting where possible (e.g. capitals).
        `;

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
                        { role: "system", content: systemPrompt },
                        { role: "user", content: resumeText }
                    ],
                    temperature: 0.1,
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
        const parsedContent = data.choices[0]?.message?.content;

        if (!parsedContent) {
            throw new Error("No response from AI");
        }

        return new Response(parsedContent, {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in parse-resume:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
