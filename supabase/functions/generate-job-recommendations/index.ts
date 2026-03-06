import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BedrockRuntimeClient, ConverseCommand } from "npm:@aws-sdk/client-bedrock-runtime";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Function started");
        const { userId, forceRefresh = false } = await req.json()

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Dynamic Import: Supabase Client
        console.log("Importing Supabase...");
        let createClient;
        try {
            const module = await import('https://esm.sh/@supabase/supabase-js@2');
            createClient = module.createClient;
        } catch (err) {
            console.error("Failed to import Supabase:", err);
            throw new Error(`Supabase import failed: ${err.message}`);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Check if user has recent recommendations
        if (!forceRefresh) {
            const { data: existingRecs } = await supabase
                .from('job_recommendations')
                .select('id, created_at')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1)

            if (existingRecs && existingRecs.length > 0) {
                return new Response(
                    JSON.stringify({
                        message: 'Recent recommendations exist. Use forceRefresh=true to regenerate.',
                        cached: true
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // Fetch user data from all interview types
        console.log("Fetching user data...");
        const { data: textInterviews } = await supabase
            .from('interview_sessions')
            .select('id, role, overall_score, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        const { data: videoInterviews } = await supabase
            .from('video_interview_sessions')
            .select('id, question, overall_score, delivery_score, body_language_score, confidence_score, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        const { data: voiceInterviews } = await supabase
            .from('voice_interview_sessions')
            .select('id, role, overall_score, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, resume_url, github_url')
            .eq('id', userId)
            .single()

        // Calculate comprehensive stats across all interview types
        const allScores = [
            ...(textInterviews || []).map((i: any) => i.overall_score).filter(Boolean),
            ...(videoInterviews || []).map((i: any) => i.overall_score).filter(Boolean),
            ...(voiceInterviews || []).map((i: any) => i.overall_score).filter(Boolean)
        ]
        const avgScore = allScores.length > 0
            ? Math.round(allScores.reduce((a: any, b: any) => a + b, 0) / allScores.length)
            : 50

        // Calculate communication skills from video interviews
        const videoScores = (videoInterviews || []).filter((i: any) => i.delivery_score && i.body_language_score && i.confidence_score)
        const avgDelivery = videoScores.length > 0
            ? Math.round(videoScores.reduce((sum: number, i: any) => sum + i.delivery_score, 0) / videoScores.length)
            : null
        const avgBodyLanguage = videoScores.length > 0
            ? Math.round(videoScores.reduce((sum: number, i: any) => sum + i.body_language_score, 0) / videoScores.length)
            : null
        const avgConfidence = videoScores.length > 0
            ? Math.round(videoScores.reduce((sum: number, i: any) => sum + i.confidence_score, 0) / videoScores.length)
            : null

        const totalInterviews = (textInterviews?.length || 0) + (videoInterviews?.length || 0) + (voiceInterviews?.length || 0)

        // Enhanced experience level detection
        let experienceLevel = 'entry'
        if (avgScore >= 80 && totalInterviews >= 8) {
            experienceLevel = 'senior'
        } else if (avgScore >= 70 && totalInterviews >= 5) {
            experienceLevel = 'mid'
        } else if (avgScore >= 60 && totalInterviews >= 3) {
            experienceLevel = 'mid'
        }

        const roles = [...new Set([
            ...(textInterviews || []).map((i: any) => i.role).filter(Boolean),
            ...(voiceInterviews || []).map((i: any) => i.role).filter(Boolean)
        ])]

        // Fetch jobs
        console.log("Fetching jobs...");
        const museUrl = `https://www.themuse.com/api/public/jobs?page=1&descending=true&category=Engineering`

        let jobPostings = [];
        try {
            const jobResponse = await fetch(museUrl)
            if (jobResponse.ok) {
                const jobData = await jobResponse.json()
                if (jobData.results) {
                    const realJobs = jobData.results.slice(0, 30).map((job: any) => ({
                        title: job.name,
                        company: job.company?.name || 'Unknown Company',
                        description: job.contents || job.short_description || '',
                        requirements: '',
                        salary_range: null,
                        location: job.locations?.[0]?.name || 'United States',
                        remote_ok: job.locations?.some((loc: any) => loc.name.toLowerCase().includes('remote')) || false,
                        experience_level: inferExperienceLevel(job.name, job.contents || ''),
                        skills_required: extractSkills(job.contents || ''),
                        application_url: job.refs?.landing_page || null,
                        source: 'themuse',
                        posted_date: new Date(job.publication_date || Date.now()).toISOString()
                    }))

                    const { error: jobInsertError } = await supabase
                        .from('job_postings')
                        .upsert(realJobs, { onConflict: 'title,company', ignoreDuplicates: true })

                    if (jobInsertError) console.error("Job insert error:", jobInsertError);
                }
            }
        } catch (e) {
            console.error("Job fetch error:", e);
        }

        // Get jobs from DB
        const { data: dbJobs } = await supabase
            .from('job_postings')
            .select('*')
            .order('posted_date', { ascending: false })
            .limit(50)

        jobPostings = dbJobs || [];

        if (jobPostings.length === 0) {
            // Fallback seed data if absolutely nothing found
            jobPostings = [{
                title: 'Software Engineer',
                company: 'Tech Corp',
                description: 'General software engineering role.',
                experience_level: 'mid',
                location: 'Remote',
                remote_ok: true,
                skills_required: ['JavaScript', 'React'],
                id: '00000000-0000-0000-0000-000000000000' // Placeholder
            }];
        }

        // AI Matching
        console.log("Starting AI matching with Bedrock...");
        const AWS_ACCESS_KEY_ID = Deno.env.get("BEDROCK_AWS_ACCESS_KEY_ID");
        const AWS_SECRET_ACCESS_KEY = Deno.env.get("BEDROCK_AWS_SECRET_ACCESS_KEY");
        const AWS_REGION = Deno.env.get("BEDROCK_AWS_REGION") || "us-east-1";

        if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
            throw new Error("Bedrock AWS credentials are not configured");
        }

        const bedrock = new BedrockRuntimeClient({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
        });

        // Enhanced AI matching prompt with comprehensive interview data
        const communicationSkills = avgDelivery ? `
- Communication Skills (from Video Interviews):
  - Delivery: ${avgDelivery}/100
  - Body Language: ${avgBodyLanguage}/100
  - Confidence: ${avgConfidence}/100` : ''

        const prompt = `You are an expert career advisor analyzing comprehensive interview performance.

CANDIDATE PROFILE:
- Average Interview Score: ${avgScore}/100
- Total Interviews Completed: ${totalInterviews}
  - Text Interviews: ${textInterviews?.length || 0}
  - Video Interviews: ${videoInterviews?.length || 0}
  - Voice Interviews: ${voiceInterviews?.length || 0}
- Experience Level: ${experienceLevel}${communicationSkills}
- Target Roles: ${roles.length > 0 ? roles.join(', ') : 'General'}

AVAILABLE JOBS:
${JSON.stringify(jobPostings.slice(0, 10).map((j: any) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            experience_level: j.experience_level,
            skills: j.skills_required,
            location: j.location,
            remote_ok: j.remote_ok
        })))}

TASK:
Match the candidate to the most suitable jobs based on:
1. Interview performance scores across all types
2. Communication and presentation skills (if available)
3. Experience level match
4. Role preferences and demonstrated skills

Return JSON with top 5-10 matches. For each match, provide:
- Accurate match_score (0-100) based on fit
- Specific match_reasons referencing actual performance data
- Relevant skill_gaps with realistic time estimates

Format:
{
  "recommendations": [
    {
      "job_id": "uuid",
      "match_score": 85,
      "match_reasons": [
        "Strong overall interview performance (avg ${avgScore}/100)",
        "Experience level matches job requirements",
        "Demonstrated excellent communication skills"
      ],
      "skill_gaps": [
        {
          "skill": "Advanced React",
          "priority": "high",
          "estimated_time": "2 weeks"
        }
      ]
    }
  ]
}`

        const command = new ConverseCommand({
            modelId: "meta.llama3-3-70b-instruct-v1:0",
            messages: [
                {
                    role: "user",
                    content: [{ text: prompt }]
                }
            ],
            system: [{ text: "You are a career advisor. Return valid JSON." }],
            inferenceConfig: {
                temperature: 0.7,
                maxTokens: 4096,
            }
        });

        const data = await bedrock.send(command);
        const aiContent = data.output?.message?.content?.[0]?.text;

        if (!aiContent) {
            throw new Error("No response from AI");
        }

        const aiResponse = JSON.parse(aiContent)
        const recommendations = aiResponse.recommendations || []

        // Store recommendations
        console.log("Storing recommendations...");
        const recommendationsToInsert = recommendations.map((rec: any) => ({
            user_id: userId,
            job_posting_id: rec.job_id,
            match_score: rec.match_score,
            match_reasons: rec.match_reasons,
            skill_gaps: rec.skill_gaps,
            status: 'new'
        }))

        // Clean up old
        await supabase.from('job_recommendations').delete().eq('user_id', userId)

        // Insert new
        const { data: insertedRecs, error: insertError } = await supabase
            .from('job_recommendations')
            .insert(recommendationsToInsert)
            .select()

        if (insertError) throw insertError;

        return new Response(
            JSON.stringify({ success: true, count: insertedRecs?.length || 0, recommendations: insertedRecs }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('CRITICAL ERROR:', error)
        return new Response(
            JSON.stringify({
                error: error.message,
                stack: error.stack,
                details: 'Check function logs'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Return 200 to see error in frontend
        )
    }
})

function inferExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    if (text.includes('senior')) return 'senior'
    if (text.includes('junior') || text.includes('entry')) return 'entry'
    return 'mid'
}

function extractSkills(description: string): string[] {
    const commonSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'AWS']
    return commonSkills.filter(skill => description.toLowerCase().includes(skill.toLowerCase()))
}
