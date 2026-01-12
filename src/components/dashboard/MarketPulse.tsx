
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Building2, Users, ArrowUpRight, Search, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketPulseProps {
    profile: any;
}

const MOCK_DATA: Record<string, { salary: string; growth: string; companies: string[]; status: "Hot" | "Warm" | "Stable" }> = {
    "Full Stack Developer": { salary: "$142,000", growth: "+12%", companies: ["Google", "Vercel", "Stripe"], status: "Hot" },
    "Frontend Engineer": { salary: "$135,000", growth: "+8%", companies: ["Airbnb", "Netflix", "Shopify"], status: "Hot" },
    "Backend Engineer": { salary: "$145,000", growth: "+10%", companies: ["Amazon", "Uber", "Microsoft"], status: "Hot" },
    "Product Manager": { salary: "$150,000", growth: "+15%", companies: ["Atlassian", "Notion", "Linear"], status: "Hot" },
    "Data Scientist": { salary: "$160,000", growth: "+18%", companies: ["OpenAI", "Meta", "Databricks"], status: "Hot" },
    "UX Designer": { salary: "$125,000", growth: "+9%", companies: ["Apple", "Figma", "Spotify"], status: "Warm" },
};

export const MarketPulse = ({ profile }: MarketPulseProps) => {
    const [role, setRole] = useState(profile?.target_role || "Full Stack Developer");
    const navigate = useNavigate();

    const handleRoleChange = async (newRole: string) => {
        setRole(newRole);
        // Optimistic update, background save
        try {
            await supabase
                .from('profiles')
                .update({ target_role: newRole } as any)
                .eq('id', profile.id);
            toast.success(`Market data updated for ${newRole}`);
        } catch (error) {
            console.error("Failed to update role", error);
        }
    };

    const data = MOCK_DATA[role] || MOCK_DATA["Full Stack Developer"];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900/50 dark:bg-gradient-to-br dark:from-indigo-950/50 dark:to-purple-950/20 backdrop-blur-xl border-gray-100 dark:border-white/5 overflow-hidden relative group">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                <CardHeader className="pb-2 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                Market Pulse
                            </CardTitle>
                            <CardDescription className="text-gray-500 dark:text-gray-400">Live insights for your target role</CardDescription>
                        </div>
                        <Select value={role} onValueChange={handleRoleChange}>
                            <SelectTrigger className="w-[180px] h-8 text-xs bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white/90">
                                <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#1a1a23] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                                {Object.keys(MOCK_DATA).map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Salary Card */}
                        <motion.div
                            className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col justify-between group/salary hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-default"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                Avg. Salary
                            </div>
                            <div>
                                <motion.div
                                    className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
                                    key={data.salary}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    {data.salary}
                                </motion.div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {data.growth} YoY Growth
                                </div>
                            </div>
                        </motion.div>

                        {/* Hiring Status Card */}
                        <motion.div
                            className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col justify-between group/status hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                Hiring Volume
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{data.status}</span>
                                    {data.status === "Hot" && (
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    High demand in <span className="text-gray-900 dark:text-white">Tech, FinTech</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Job Matches Card - Relocated */}
                        <motion.div
                            className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col justify-between group/jobs hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => navigate("/job-recommendations")}
                        >
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <Briefcase className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                                Job Matches
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">12</span>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                                    </span>
                                </div>
                                <div className="text-xs text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1 mt-1">
                                    View Recommended Jobs
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Top Companies Ticker */}
                    <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 mb-2 uppercase tracking-wider font-semibold">
                            <Users className="w-3 h-3" /> Top Companies Hiring Now
                        </div>
                        <div className="flex gap-2 overflow-hidden mask-linear-fade">
                            {data.companies.map((company, i) => (
                                <motion.div
                                    key={company}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 text-xs text-gray-700 dark:text-white whitespace-nowrap shadow-sm dark:shadow-none"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <img
                                        src={`https://logo.clearbit.com/${company.toLowerCase()}.com`}
                                        crossOrigin="anonymous"
                                        className="w-4 h-4 rounded-full bg-white"
                                        onError={(e) => e.currentTarget.style.display = 'none'}
                                    />
                                    {company}
                                </motion.div>
                            ))}
                            <motion.div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer transition-colors shadow-sm dark:shadow-none"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                onClick={() => navigate("/companies")}
                            >
                                + 142 others
                            </motion.div>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </motion.div>
    );
};
