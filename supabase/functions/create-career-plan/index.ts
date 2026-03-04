import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BedrockRuntimeClient, ConverseCommand } from "npm:@aws-sdk/client-bedrock-runtime";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userId, targetRole, jobRecommendationId } = await req.json()

        if (!userId || !targetRole) {
            return new Response(
                JSON.stringify({ error: 'userId and targetRole are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch user's interview performance
        const { data: textInterviews } = await supabase
            .from('interview_sessions')
            .select('overall_score, role')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        const { data: videoInterviews } = await supabase
            .from('video_interview_sessions')
            .select('overall_score, delivery_score, body_language_score, confidence_score, role')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        // Calculate strengths and weaknesses
        const allScores = [
            ...(textInterviews || []).map(i => i.overall_score).filter(Boolean),
            ...(videoInterviews || []).map(i => i.overall_score).filter(Boolean)
        ]
        const avgScore = allScores.length > 0
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 50

        const videoScores = videoInterviews || []
        const avgDelivery = videoScores.length > 0
            ? Math.round(videoScores.reduce((sum, i) => sum + (i.delivery_score || 0), 0) / videoScores.length)
            : 0
        const avgBodyLanguage = videoScores.length > 0
            ? Math.round(videoScores.reduce((sum, i) => sum + (i.body_language_score || 0), 0) / videoScores.length)
            : 0
        const avgConfidence = videoScores.length > 0
            ? Math.round(videoScores.reduce((sum, i) => sum + (i.confidence_score || 0), 0) / videoScores.length)
            : 0

        // Identify strengths and weaknesses
        const strengths = []
        const weaknesses = []

        if (avgDelivery > 75) strengths.push('Strong communication and delivery')
        else if (avgDelivery < 60) weaknesses.push('Communication and delivery')

        if (avgBodyLanguage > 75) strengths.push('Excellent body language and presence')
        else if (avgBodyLanguage < 60) weaknesses.push('Body language and presence')

        if (avgConfidence > 75) strengths.push('High confidence in interviews')
        else if (avgConfidence < 60) weaknesses.push('Interview confidence')

        if (avgScore > 75) strengths.push('Consistently strong interview performance')
        else if (avgScore < 60) weaknesses.push('Overall interview performance')

        // Get skill gaps if job recommendation is provided
        let skillGaps = []
        if (jobRecommendationId) {
            const { data: recommendation } = await supabase
                .from('job_recommendations')
                .select('skill_gaps')
                .eq('id', jobRecommendationId)
                .eq('user_id', userId)
                .single()

            if (recommendation && recommendation.skill_gaps) {
                skillGaps = recommendation.skill_gaps
            }
        }

        // Initialize Bedrock
        const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
        const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
        const AWS_REGION = Deno.env.get("AWS_REGION") || "us-east-1";

        if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
            throw new Error("AWS credentials are not configured");
        }

        const bedrock = new BedrockRuntimeClient({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
        });

        // Prepare prompt for AI
        const prompt = `You are an expert career coach specializing in creating actionable 3-month career development plans.

Create a detailed 3-month plan for this candidate:

TARGET ROLE: ${targetRole}

CURRENT PROFILE:
- Average Interview Score: ${avgScore}/100
- Delivery Skills: ${avgDelivery}/100
- Body Language: ${avgBodyLanguage}/100
- Confidence: ${avgConfidence}/100
- Strengths: ${strengths.join(', ') || 'To be developed'}
- Areas to Improve: ${weaknesses.join(', ') || 'None identified'}
${skillGaps.length > 0 ? `- Skill Gaps to Address: ${skillGaps.map((g: any) => g.skill).join(', ')}` : ''}

TASK:
Create a comprehensive 3-month career plan to help them land a ${targetRole} position.

Structure the plan as follows:

MONTH 1 - Foundation Building:
- Main focus areas (2-3 key skills/topics)
- Specific weekly tasks (4 weeks)
- Learning resources (free and paid)
- Practice projects to build
- Measurable milestone

MONTH 2 - Advanced Skills & Projects:
- Main focus areas (2-3 advanced topics)
- Specific weekly tasks (4 weeks)
- Learning resources
- Portfolio projects to showcase
- Measurable milestone

MONTH 3 - Interview Prep & Job Search:
- Interview preparation focus
- Specific weekly tasks (4 weeks)
- Mock interview practice
- Job application strategy
- Final milestone

Return ONLY valid JSON in this exact format:
{
  "target_role": "${targetRole}",
  "current_skill_level": "entry|mid|senior",
  "month_1_goals": {
    "title": "Foundation Building",
    "focus_areas": ["area1", "area2"],
    "milestone": "Specific measurable goal"
  },
  "month_2_goals": {
    "title": "Advanced Skills",
    "focus_areas": ["area1", "area2"],
    "milestone": "Specific measurable goal"
  },
  "month_3_goals": {
    "title": "Interview & Job Search",
    "focus_areas": ["area1", "area2"],
    "milestone": "Specific measurable goal"
  },
  "weekly_tasks": [
    {
      "month": 1,
      "week": 1,
      "tasks": ["task1", "task2", "task3"],
      "completed": false
    }
  ],
  "resources": [
    {
      "title": "Resource name",
      "type": "course|book|tutorial|documentation",
      "url": "https://...",
      "cost": "free|paid",
      "priority": "high|medium|low"
    }
  ],
  "milestones": [
    {
      "month": 1,
      "title": "Milestone name",
      "description": "What to achieve",
      "achieved": false
    }
  ]
}`;

        const command = new ConverseCommand({
            modelId: "meta.llama3-3-70b-instruct-v1:0",
            messages: [
                {
                    role: "user",
                    content: [{ text: prompt }]
                }
            ],
            system: [{ text: "You are an expert career coach. Always respond with valid JSON only. Be specific and actionable." }],
            inferenceConfig: {
                temperature: 0.8,
                maxTokens: 4000,
            }
        });

        const data = await bedrock.send(command);
        const aiResponse = data.output?.message?.content?.[0]?.text;

        if (!aiResponse) {
            throw new Error("No response from AI");
        }

        const careerPlan = JSON.parse(aiResponse);

        // Store career plan in database
        const { data: insertedPlan, error: insertError } = await supabase
            .from('user_career_plans')
            .insert({
                user_id: userId,
                target_role: targetRole,
                current_skill_level: careerPlan.current_skill_level || 'mid',
                month_1_goals: careerPlan.month_1_goals || {},
                month_2_goals: careerPlan.month_2_goals || {},
                month_3_goals: careerPlan.month_3_goals || {},
                weekly_tasks: careerPlan.weekly_tasks || [],
                resources: careerPlan.resources || [],
                milestones: careerPlan.milestones || [],
                progress_percentage: 0,
                job_recommendation_id: jobRecommendationId || null
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting career plan:', insertError)
            return new Response(
                JSON.stringify({ error: 'Failed to store career plan', details: insertError }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                plan: insertedPlan
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in create-career-plan:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
