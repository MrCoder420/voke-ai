import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { platform, username, identifier } = await req.json();

        if (!platform || !username || !identifier) {
            throw new Error("Platform, username, and identifier are required");
        }

        let isSolved = false;

        if (platform === "LeetCode") {
            const query = `
                query userRecentAcSubmissions($username: String!, $limit: Int!) {
                    recentAcSubmissionList(username: $username, limit: $limit) {
                        title
                        titleSlug
                        timestamp
                    }
                }
            `;

            const response = await fetch("https://leetcode.com/graphql", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                body: JSON.stringify({
                    query,
                    variables: { username, limit: 20 },
                }),
            });

            const data = await response.json();
            if (data.data?.recentAcSubmissionList) {
                // Check if identifier match title or titleSlug
                isSolved = data.data.recentAcSubmissionList.some(
                    (sub: any) => sub.title === identifier || sub.titleSlug === identifier
                );
            }
        } else if (platform === "Codeforces") {
            const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=50`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }
            });
            const data = await response.json();

            if (data.status === "OK") {
                isSolved = data.result.some((sub: any) =>
                    sub.verdict === "OK" &&
                    (sub.problem.name === identifier || `${sub.problem.contestId}${sub.problem.index}` === identifier)
                );
            }
        }

        return new Response(JSON.stringify({ isSolved }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
