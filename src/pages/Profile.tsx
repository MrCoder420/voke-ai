import InterviewAnalytics from "@/components/InterviewAnalytics";
import ResumeAnalyzer from "@/components/ResumeAnalyzer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Award,
  BarChart3,
  Brain,
  Camera,
  ChevronRight,
  Code,
  FileText,
  Github,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Upload,
  User,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    codeforces_id: "",
    leetcode_id: "",
    github_url: "",
  });
  const [codingStats, setCodingStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    completedSessions: 0,
    averageScore: 0,
    peerSessions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [showMandatoryModal, setShowMandatoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkAuth();
    loadProfile();
    loadStats();
    loadRecentActivity();
    loadSkillGaps();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        const profile = profileData as any;
        // Fallback to Google Avatar if not set in profile
        if (!profile.avatar_url && user.user_metadata?.avatar_url) {
          profile.avatar_url = user.user_metadata.avatar_url;
        }
        setProfile(profile);
        setFormData({
          full_name: profile.full_name || "",
          codeforces_id: profile.codeforces_id || "",
          leetcode_id: profile.leetcode_id || "",
          github_url: profile.github_url || "",
        });
        if (profile.coding_stats) {
          setCodingStats(profile.coding_stats);
        }

        const hasResume = profile.resume_url;
        setShowMandatoryModal(!profile.github_url || !profile.resume_url);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id);

      const { data: videoSessions } = await supabase
        .from("video_interview_sessions")
        .select("overall_score")
        .eq("user_id", user.id)
        .not("overall_score", "is", null);

      const { data: peerSessions } = await supabase
        .from("peer_interview_sessions")
        .select("*")
        .or(`host_user_id.eq.${user.id},guest_user_id.eq.${user.id}`);

      const totalInterviews = (sessions?.length || 0) + (videoSessions?.length || 0) + (peerSessions?.filter((p: any) => p.status === 'completed').length || 0);
      const completedSessions = sessions?.filter(s => s.status === "completed").length || 0;
      const avgScore = videoSessions?.length
        ? videoSessions.reduce((acc, s) => acc + s.overall_score, 0) / videoSessions.length
        : 0;

      setStats({
        totalInterviews,
        completedSessions,
        averageScore: Math.round(avgScore),
        peerSessions: peerSessions?.length || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivity(sessions || []);
    } catch (error) {
      console.error("Error loading recent activity:", error);
    }
  };

  const loadSkillGaps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: recommendations } = await supabase
        .from("user_career_recommendations")
        .select("skill_gaps")
        .eq("user_id", user.id)
        .maybeSingle();

      if (recommendations?.skill_gaps) {
        setSkillGaps(recommendations.skill_gaps as any[] || []);
      }
    } catch (error) {
      console.error("Error loading skill gaps:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Sanitize handles (remove URL parts if present)
      const sanitizedData = { ...formData };

      const sanitizeHandle = (handle: string, domain: string) => {
        if (!handle) return "";
        let clean = handle.trim();
        if (clean.endsWith('/')) clean = clean.slice(0, -1);
        if (clean.includes(domain)) {
          const parts = clean.split('/');
          return parts[parts.length - 1];
        }
        return clean;
      };

      sanitizedData.leetcode_id = sanitizeHandle(sanitizedData.leetcode_id, "leetcode.com");
      sanitizedData.codeforces_id = sanitizeHandle(sanitizedData.codeforces_id, "codeforces.com");

      // Update state with sanitized values to reflect in UI immediately
      setFormData(prev => ({
        ...prev,
        leetcode_id: sanitizedData.leetcode_id,
        codeforces_id: sanitizedData.codeforces_id
      }));

      const { error } = await supabase
        .from("profiles")
        .update(sanitizedData)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.")) {
      return;
    }

    const userInput = window.prompt("Type 'DELETE' to confirm account deletion:");
    if (userInput !== "DELETE") {
      toast.error("Deletion cancelled");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Starting account deletion via Edge Function...");

      const { error: funcError } = await supabase.functions.invoke('delete-user-account');

      if (funcError) {
        throw new Error(funcError.message || "Failed to invoke deletion function");
      }

      console.log("Deletion complete. Signing out...");
      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      navigate("/");

    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(`Failed to delete account: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncStats = async () => {
    if (!formData.codeforces_id && !formData.leetcode_id) {
      toast.error("Please enter Codeforces or LeetCode handle first");
      return;
    }

    setSyncing(true);
    const newStats: any = { ...codingStats };

    try {
      if (formData.codeforces_id) {
        try {
          const { data, error } = await supabase.functions.invoke('fetch-codeforces-data', {
            body: { handle: formData.codeforces_id }
          });
          if (error) throw error;
          if (data.error) throw new Error(data.error);
          newStats.codeforces = data;
          toast.success("Codeforces stats synced!");
        } catch (e: any) {
          console.error("Codeforces sync error:", e);
          toast.error(`Codeforces: ${e.message || "Failed to sync"}`);
        }
      }

      if (formData.leetcode_id) {
        try {
          const { data, error } = await supabase.functions.invoke('fetch-leetcode-data', {
            body: { username: formData.leetcode_id }
          });
          if (error) throw error;
          if (data.error) throw new Error(data.error);
          newStats.leetcode = data;
          toast.success("LeetCode stats synced!");
        } catch (e: any) {
          console.error("LeetCode sync error:", e);
          toast.error(`LeetCode: ${e.message || "Failed to sync"}`);
        }
      }

      setCodingStats(newStats);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updateData: any = {
          coding_stats: newStats,
          codeforces_id: formData.codeforces_id,
          leetcode_id: formData.leetcode_id
        };

        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);

        if (updateError) throw updateError;
      }

    } catch (error: any) {
      console.error("Error syncing stats:", error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      toast.error("Please select a file first");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = resumeFile.name.split(".").pop();
      const fileName = `${user.id}/resume.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile, {
          upsert: true,
          contentType: resumeFile.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      const separator = publicUrl.includes('?') ? '&' : '?';
      const publicUrlWithTimestamp = `${publicUrl}${separator}t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ resume_url: publicUrlWithTimestamp })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Resume uploaded successfully!");
      loadProfile();
      setResumeFile(null);
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast.error("Failed to upload resume");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlWithTimestamp } as any)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: publicUrlWithTimestamp });
      toast.success('Avatar updated!');
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error('Error uploading avatar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse"></div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="h-12 w-12 text-violet-500 relative z-10" />
          </motion.div>
          <div className="mt-4 text-muted-foreground font-mono text-sm">LOADING PROFILE_DATA...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-violet-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-fuchsia-600/5 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      </div>

      <div className="relative">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
              <img
                src="/images/voke_logo.png"
                alt="Voke Logo"
                className="w-10 h-10 object-contain"
              />
              <span className="font-bold text-lg tracking-tight">Voke</span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Identity Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Card className="bg-card/50 backdrop-blur-xl border-border/50 overflow-hidden relative">
                  <div className="h-32 bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                  </div>
                  <div className="px-6 pb-6 relative">
                    <div className="relative -mt-16 mb-4 flex justify-center lg:justify-start">
                      <div className="relative w-32 h-32 group/avatar">
                        <div className="w-full h-full rounded-3xl bg-card p-1 ring-4 ring-background/50 shadow-2xl overflow-hidden relative">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} crossOrigin="anonymous" alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                              <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">
                                {profile?.full_name?.charAt(0) || "U"}
                              </span>
                            </div>
                          )}

                          {/* Upload Overlay */}
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-2xl">
                            <Camera className="w-8 h-8 text-white/80" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={saving} />
                          </label>
                        </div>
                        <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-4 border-background shadow-lg z-10"></div>
                      </div>
                    </div>

                    <div className="text-center lg:text-left space-y-1">
                      <h2 className="text-2xl font-bold text-foreground">{profile?.full_name || "Anonymous User"}</h2>
                      <p className="text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                        <Code className="w-4 h-4 text-violet-500" />
                        Senior Developer
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/20 px-3 py-1">
                        LEVEL {Math.floor(((stats.completedSessions * 500) + (stats.peerSessions * 300)) / 2000) + 1}
                      </Badge>
                      <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20 px-3 py-1">
                        {Math.floor(((stats.completedSessions * 500) + (stats.peerSessions * 300)) / 2000) + 1 >= 5 ? 'MASTER' : 'SCHOLAR'}
                      </Badge>
                    </div>

                    <div className="mt-8 space-y-4">
                      {(() => {
                        const xp = (stats.completedSessions * 500) + (stats.peerSessions * 300);
                        const level = Math.floor(xp / 2000) + 1;
                        const nextLevelXp = level * 2000;
                        const currentLevelStartXp = (level - 1) * 2000;
                        const progress = ((xp - currentLevelStartXp) / (nextLevelXp - currentLevelStartXp)) * 100;

                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">XP Progress</span>
                              <span className="text-foreground font-mono">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </>
                        );
                      })()}
                    </div>

                    {/* Social/External Links */}
                    <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full border-border/50 bg-secondary/20 hover:bg-secondary/40 justify-start" onClick={() => window.open(profile.github_url, '_blank')}>
                        <Github className="w-4 h-4 mr-2" />
                        GitHub
                      </Button>
                      <Button variant="outline" className="w-full border-border/50 bg-secondary/20 hover:bg-secondary/40 justify-start">
                        <Terminal className="w-4 h-4 mr-2" />
                        LeetCode
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Interviews", value: stats.totalInterviews, icon: Target, color: "text-blue-500" },
                  { label: "Completed", value: stats.completedSessions, icon: Award, color: "text-green-500" },
                  { label: "Avg Score", value: `${stats.averageScore}%`, icon: TrendingUp, color: "text-fuchsia-500" },
                  { label: "Peers", value: stats.peerSessions, icon: User, color: "text-orange-500" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                  >
                    <Card className="bg-card/50 border-border/50 hover:bg-secondary/20 transition-colors">
                      <CardContent className="p-4 flex flex-col gap-2">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        <div>
                          <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8">
              <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
                <TabsList className="bg-card/50 border border-border/50 p-1 rounded-xl w-full flex overflow-x-auto">
                  {[
                    { id: "overview", label: "Overview", icon: Activity },
                    { id: "analytics", label: "Analytics", icon: BarChart3 },
                    { id: "resume", label: "Resume", icon: FileText },
                    { id: "skills", label: "Skills", icon: Brain },
                    { id: "settings", label: "Settings", icon: Settings },
                  ].map(tab => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex-1 min-w-[100px] gap-2 rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all"
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <AnimatePresence mode="wait">
                  {/* OVERVIEW TAB */}
                  {activeTab === "overview" && (
                    <TabsContent key="overview" value="overview" className="space-y-6 outline-none">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6">

                        {/* AI Coach Banner */}
                        <Card className="bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20 border-violet-500/20 overflow-hidden relative">
                          <div className="absolute right-0 top-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full" />
                          <CardContent className="p-8 relative z-10 flex items-center justify-between">
                            <div className="space-y-4 max-w-lg">
                              <div className="flex items-center gap-2 text-violet-400 font-medium text-sm">
                                <Sparkles className="w-4 h-4" />
                                <span>AI Interview Coach</span>
                              </div>
                              <h3 className="text-3xl font-bold text-foreground leading-tight">Ready for your next mock interview?</h3>
                              <p className="text-muted-foreground">Your AI coach is ready to analyze your performance and provide real-time feedback.</p>
                              <Button onClick={() => navigate('/interview/new')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                Start Session <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                            <div className="hidden md:block text-9xl select-none opacity-20 transform rotate-12">
                              🎙️
                            </div>
                          </CardContent>
                        </Card>

                        {/* Recent Activity Feed */}
                        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Activity className="w-5 h-5 text-muted-foreground" />
                              Recent Activity
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {recentActivity.length === 0 ? (
                              <div className="text-center py-12 text-muted-foreground">No recent activity</div>
                            ) : (
                              recentActivity.map((activity, idx) => (
                                <div key={activity.id || `activity-${idx}`} className="flex items-center justify-between p-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors border border-border/50">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${activity.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                      <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-foreground capitalize">{activity.interview_type} Interview</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(activity.created_at).toLocaleDateString()} • {activity.total_duration_seconds ? Math.round(activity.total_duration_seconds / 60) + ' mins' : 'Incomplete'}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="secondary">
                                    {activity.status}
                                  </Badge>
                                </div>
                              ))
                            )}
                          </CardContent>
                        </Card>

                      </motion.div>
                    </TabsContent>
                  )}

                  {/* SETTINGS TAB */}
                  {activeTab === "settings" && (
                    <TabsContent key="settings" value="settings" className="space-y-6 outline-none">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                          <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>Manage your personal information and connections.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                  value={formData.full_name}
                                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                  className="bg-background/50 border-input focus:border-violet-500 transition-colors h-11"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={profile?.email} disabled className="bg-background/30 border-input text-muted-foreground h-11" />
                              </div>
                              <div className="space-y-2">
                                <Label>GitHub URL <span className="text-red-500 font-bold">*</span></Label>
                                <Input
                                  value={formData.github_url}
                                  placeholder="https://github.com/yourusername"
                                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                                  className="bg-background/50 border-input focus:border-violet-500 transition-colors h-11"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>LeetCode Username</Label>
                                <Input
                                  value={formData.leetcode_id}
                                  placeholder="e.g. neal_wu"
                                  onChange={(e) => setFormData({ ...formData, leetcode_id: e.target.value })}
                                  className="bg-background/50 border-input focus:border-violet-500 transition-colors h-11"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Codeforces Handle</Label>
                                <Input
                                  value={formData.codeforces_id}
                                  placeholder="e.g. tourist"
                                  onChange={(e) => setFormData({ ...formData, codeforces_id: e.target.value })}
                                  className="bg-background/50 border-input focus:border-violet-500 transition-colors h-11"
                                />
                              </div>
                            </div>

                            <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                              <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                              >
                                Delete Account
                              </Button>
                              <div className="flex gap-4 w-full sm:w-auto">
                                <Button
                                  variant="outline"
                                  onClick={handleSyncStats}
                                  disabled={syncing}
                                  className="border-input bg-secondary/20 hover:bg-secondary/40 flex-1 sm:flex-none"
                                >
                                  {syncing ? "Syncing..." : "Sync Stats"}
                                </Button>
                                <Button
                                  onClick={handleSave}
                                  disabled={saving}
                                  className="bg-violet-600 hover:bg-violet-500 text-white flex-1 sm:flex-none"
                                >
                                  {saving ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </TabsContent>
                  )}

                  {/* RESUME TAB */}
                  {activeTab === "resume" && (
                    <TabsContent key="resume" value="resume" className="space-y-6 outline-none">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                          <CardHeader>
                            <CardTitle>Resume Verification <span className="text-red-500 font-bold">*</span></CardTitle>
                            <CardDescription>Upload your latest resume to keep your profile updated.</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="border-2 border-dashed border-border/50 rounded-2xl p-8 hover:border-violet-500/50 transition-colors bg-secondary/5 text-center relative group">
                              <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                              />
                              <div className="mx-auto w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                {resumeFile ? (
                                  <FileText className="w-8 h-8 text-violet-500" />
                                ) : (
                                  <Upload className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                              <h3 className="text-lg font-medium text-foreground mb-2">
                                {resumeFile ? resumeFile.name : "Drop your resume here"}
                              </h3>
                              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                Supports PDF, DOC, DOCX. Max file size 5MB.
                              </p>
                              {resumeFile && (
                                <Button
                                  className="mt-6 bg-violet-600 hover:bg-violet-500 text-white relative z-30"
                                  onClick={handleResumeUpload}
                                  disabled={saving}
                                >
                                  {saving ? "Uploading..." : "Confirm Upload"}
                                </Button>
                              )}
                            </div>

                            {profile?.resume_url && (
                              <div className="mt-6 flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-500/20 rounded-lg">
                                    <Shield className="w-5 h-5 text-green-500" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-green-500">Resume Verified</div>
                                    <div className="text-xs text-green-500/80">Last updated recently</div>
                                  </div>
                                </div>
                                <Button
                                  variant="link"
                                  className="text-green-500 hover:text-green-600"
                                  onClick={() => window.open(profile.resume_url, '_blank')}
                                >
                                  View
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <ResumeAnalyzer userId={profile?.id || ""} resumeUrl={profile?.resume_url} />
                      </motion.div>
                    </TabsContent>
                  )}

                  {/* ANALYTICS TAB */}
                  {activeTab === "analytics" && (
                    <TabsContent key="analytics" value="analytics" className="outline-none">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <InterviewAnalytics userId={profile?.id || ""} />
                      </motion.div>
                    </TabsContent>
                  )}

                  {/* SKILLS TAB */}
                  {activeTab === "skills" && (
                    <TabsContent key="skills" value="skills" className="outline-none">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                          <CardHeader>
                            <CardTitle>Skill Gap Analysis</CardTitle>
                            <CardDescription>Areas for improvement based on your interview performance.</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {skillGaps.length === 0 ? (
                              <div className="text-center py-12">
                                <div className="inline-block p-4 rounded-full bg-secondary/20 mb-4">
                                  <Target className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">No Gaps Detected Yet</h3>
                                <p className="text-muted-foreground">Complete more interviews to generate a skill analysis.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {skillGaps.map((gap: any, i) => (
                                  <div key={i} className="p-4 rounded-xl bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-bold text-foreground text-lg">{gap.skill}</h4>
                                      <Badge variant={gap.importance === 'High' ? 'destructive' : 'default'}>{gap.importance}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-4">{gap.learning_resource}</p>
                                    <div className="flex items-center gap-3 text-sm">
                                      <Progress value={Math.random() * 60 + 20} className="h-1.5" />
                                      <span className="text-muted-foreground font-mono">In Progress</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </TabsContent>
                  )}

                </AnimatePresence>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Mandatory Modal */}
        <Dialog open={showMandatoryModal} onOpenChange={setShowMandatoryModal}>
          <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Complete Your Profile</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                To continue using Voke, please provide the following mandatory information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="modal_github_url" className="text-right">GitHub URL <span className="text-red-500">*</span></Label>
                <Input
                  id="modal_github_url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/yourusername"
                  className="bg-background/50 border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_leetcode_id" className="text-right">LeetCode Username</Label>
                <Input
                  id="modal_leetcode_id"
                  value={formData.leetcode_id}
                  onChange={(e) => setFormData({ ...formData, leetcode_id: e.target.value })}
                  placeholder="e.g. neal_wu"
                  className="bg-background/50 border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_codeforces_id" className="text-right">Codeforces Handle</Label>
                <Input
                  id="modal_codeforces_id"
                  value={formData.codeforces_id}
                  onChange={(e) => setFormData({ ...formData, codeforces_id: e.target.value })}
                  placeholder="e.g. tourist"
                  className="bg-background/50 border-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right">Resume <span className="text-red-500">*</span></Label>
                {!profile?.resume_url ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-secondary/10 relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setResumeFile(file);
                      }}
                    />
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {resumeFile ? resumeFile.name : "Click to upload resume"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 text-green-500 rounded-md">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">Resume Uploaded</span>
                  </div>
                )}
                {resumeFile && !profile?.resume_url && (
                  <Button
                    onClick={handleResumeUpload}
                    disabled={saving}
                    size="sm"
                    className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {saving ? "Uploading..." : "Upload Resume Now"}
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={async () => {
                  if (!formData.github_url) {
                    toast.error("Please provide your GitHub URL");
                    return;
                  }
                  if (!profile?.resume_url && !resumeFile) {
                    toast.error("Please upload a resume");
                    return;
                  }
                  await handleSave();
                }}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Profile;
