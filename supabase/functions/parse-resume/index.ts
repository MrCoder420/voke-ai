import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BedrockRuntimeClient, ConverseCommand } from "npm:@aws-sdk/client-bedrock-runtime";

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

        const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
        const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
        const AWS_REGION = Deno.env.get("AWS_REGION") || "us-east-1";

        if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
            throw new Error("AWS credentials are not configured");
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

        console.log(`Parsing resume text with Bedrock Llama 3.3 (length: ${resumeText.length})`);

        const bedrock = new BedrockRuntimeClient({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
        });

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

        const command = new ConverseCommand({
            modelId: "meta.llama3-3-70b-instruct-v1:0",
            messages: [
                {
                    role: "user",
                    content: [{ text: resumeText }]
                }
            ],
            system: [{ text: systemPrompt }],
            inferenceConfig: {
                temperature: 0.1,
                maxTokens: 4096,
            }
        });

        const data = await bedrock.send(command);
        const parsedContent = data.output?.message?.content?.[0]?.text;

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
