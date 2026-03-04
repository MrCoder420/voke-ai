import SixQAnalysis from "@/components/SixQAnalysis";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ArrowLeft, Award, CheckCircle2, LogOut, MessageSquare, Mic, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const VoiceInterviewResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadResults();

    // Subscribe to realtime updates for this session
    const channel = supabase
      .channel(`session-results-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interview_sessions',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          setSession(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  // Keep loading if data is being fetched OR if session exists but hasn't been analyzed yet
  if (loading || (session && session.overall_score === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
          <p className="text-muted-foreground animate-pulse text-lg font-medium">
            {session ? "Generating your detailed report..." : "Analyzing your conversation..."}
          </p>
          {session && (
            <p className="text-sm text-muted-foreground/60 max-w-xs text-center">
              Our AI is reviewing your transcript to provide evidence-based feedback. This usually takes 10-15 seconds.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">The voice interview session could not be found.</p>
            <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img
              src="/images/voke_logo.png"
              alt="Voke Logo"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Voice Analysis
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/voice-assistant")} className="mb-8 hover:bg-violet-500/10 hover:text-violet-500 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assistant
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Score */}
          <div className="lg:col-span-1 space-y-6">
            {/* Score Card */}
            <Card className="bg-card/30 backdrop-blur-xl border-border/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5"></div>
              <CardContent className="pt-8 pb-8 text-center relative z-10">
                <h3 className="text-lg font-medium text-muted-foreground mb-6">Conversation Score</h3>
                <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full opacity-20 bg-gradient-to-br ${getScoreGradient(session.overall_score || 0)} blur-xl`}></div>
                  <div className="w-full h-full rounded-full border-4 border-muted flex items-center justify-center bg-background/50 backdrop-blur-sm relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className={`text-transparent stroke-current ${getScoreColor(session.overall_score || 0)}`}
                        strokeDasharray={`${(session.overall_score || 0) * 2.89} 289`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center">
                      <span className={`text-4xl font-bold block ${getScoreColor(session.overall_score || 0)}`}>
                        {session.overall_score || 0}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Score</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-medium border border-violet-500/20">
                    AI Analyzed
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs font-medium border border-purple-500/20">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Transcript Card */}
            <Card className="bg-card/30 backdrop-blur-xl border-border/50 overflow-hidden flex flex-col h-[500px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-500" />
                  Transcript
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {session.transcript && Array.isArray(session.transcript) ? (
                  session.transcript.map((msg: any, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                          ? 'bg-primary/20 text-primary-foreground rounded-tr-sm'
                          : 'bg-muted/50 text-muted-foreground rounded-tl-sm'
                        }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center italic">No transcript available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Detailed Analysis */}
          <div className="lg:col-span-2 space-y-6">

            {/* Metrics Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/30 backdrop-blur-xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                    <Mic className="w-4 h-4" />
                    <span className="text-sm font-medium">Communication</span>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className={`text-3xl font-bold ${getScoreColor(session.delivery_score || 0)}`}>
                      {session.delivery_score || 0}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/100</span>
                  </div>
                  <Progress value={session.delivery_score || 0} className="h-1.5" />
                </CardContent>
              </Card>

              <Card className="bg-card/30 backdrop-blur-xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Content Quality</span>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className={`text-3xl font-bold ${getScoreColor(session.confidence_score || 0)}`}>
                      {session.confidence_score || 0}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/100</span>
                  </div>
                  <Progress value={session.confidence_score || 0} className="h-1.5" />
                </CardContent>
              </Card>
            </div>

            {/* Model Answer / Suggestions Section */}
            {session.feedback_summary && (
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    Key Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: session.feedback_summary.replace(/\n/g, "<br>") }} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* What's Good / What's Wrong Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* What's Good */}
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {session.whats_good && Array.isArray(session.whats_good) && session.whats_good.length > 0 ? (
                    <ul className="space-y-3">
                      {session.whats_good.map((item: string, idx: number) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></span>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : session.analysis_result?.strengths ? (
                    <ul className="space-y-3">
                      {session.analysis_result.strengths.map((strength: string, idx: number) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></span>
                          <span className="text-muted-foreground">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific strengths identified yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* What's Wrong */}
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {session.whats_wrong && Array.isArray(session.whats_wrong) && session.whats_wrong.length > 0 ? (
                    <ul className="space-y-3">
                      {session.whats_wrong.map((item: string, idx: number) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></span>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : session.analysis_result?.improvements ? (
                    <ul className="space-y-3">
                      {session.analysis_result.improvements.map((improvement: string, idx: number) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></span>
                          <span className="text-muted-foreground">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific improvements identified yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 6Q Analysis */}
            {session.six_q_score ? (
              <div className="pt-4">
                <SixQAnalysis
                  scores={session.six_q_score}
                  cluster={session.personality_cluster}
                />
              </div>
            ) : (
              <Card className="bg-muted/30 border-dashed border-border">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Personality analysis is not available for this session. <br />
                    <span className="text-sm">Complete more interviews to build your profile.</span>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.8);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default VoiceInterviewResults;
