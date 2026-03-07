import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { supabase } from "@/integrations/supabase/client";
import { loadUserProfileContext, ProfileContext } from "@/utils/profileContext";
import {
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Send,
  Settings,
  User,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Interview Categories
const CATEGORIES = [
  { id: 'general', label: 'General Interview', icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
];

interface Message {
  role: "assistant" | "user";
  content: string;
}

const InterviewNew = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
  const [questionCount, setQuestionCount] = useState(0); // Track number of questions asked
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sessionActive, setSessionActive] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [codingStats, setCodingStats] = useState<any>(null);
  const [profileContext, setProfileContext] = useState<ProfileContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Chat Hook
  const { isListening, speak, stopListening, stopSpeaking } = useVoiceChat({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInput(text);
        setTimeout(() => {
          if (text.trim()) handleSendMessage(text);
        }, 1000);
      }
    },
    onError: (error) => toast.error(error),
  });

  useEffect(() => {
    checkAuth();
    loadCodingStats();
    loadContext();
    // Initialize with the first message of the active category
    startSession(activeCategory);
  }, []);

  const loadContext = async () => {
    try {
      const context = await loadUserProfileContext();
      setProfileContext(context);
    } catch (error) {
      console.error("Error loading profile context:", error);
    }
  };

  const loadCodingStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("coding_stats")
        .eq("id", user.id)
        .single();

      if (profile && (profile as any).coding_stats) {
        setCodingStats((profile as any).coding_stats);
      }
    } catch (error) {
      console.error("Error loading coding stats:", error);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const generateAIQuestion = async (currentMessages: Message[], count: number) => {
    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke('generate-interview-question', {
        body: {
          messages: currentMessages,
          interview_type: CATEGORIES.find(c => c.id === activeCategory)?.label || "General",
          question_count: count,
          coding_stats: codingStats,
          profile_context: profileContext?.context
        }
      });

      if (error) throw error;

      if (data) {
        // If there's feedback, add it as a separate message before the question
        if (data.feedback) {
          const feedbackContent = `### ✅ What Went Well
${data.feedback.what_went_well?.map((point: string) => `- ${point}`).join('\n') || '- Good effort'}

### ⚠️ What Needs Improvement
${data.feedback.what_needs_improvement?.map((point: string) => `- ${point}`).join('\n') || '- Keep practicing'}

### 📝 Model Answer
${data.feedback.model_answer || 'N/A'}

${data.feedback.verification_note ? `### 🔍 Verification Note\n${data.feedback.verification_note}` : ''}`;

          const feedbackMsg: Message = { role: "assistant", content: feedbackContent };
          setMessages(prev => [...prev, feedbackMsg]);
        }

        // Then add the next question
        const aiMsg: Message = { role: "assistant", content: data.question };
        setMessages(prev => [...prev, aiMsg]);
        if (voiceMode) speak(data.question);

        if (data.is_finished) {
          setIsFinished(true);
          setSessionActive(false);
        } else {
          setQuestionCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error generating question:", error);
      toast.error("Failed to generate question. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const startSession = (category: string) => {
    setMessages([]);
    setQuestionCount(0);
    setStartTime(Date.now());
    setSessionActive(true);
    setIsFinished(false);

    // Generate opening question
    generateAIQuestion([], 0);
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    startSession(categoryId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const [isCompleting, setIsCompleting] = useState(false);

  const completeSession = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setSessionActive(false);

    const duration = Math.round((Date.now() - startTime) / 1000 / 60); // in minutes

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Call AI to evaluate the interview
        const { data: evaluation, error: aiError } = await supabase.functions.invoke('evaluate-interview', {
          body: {
            messages: messages,
            interview_type: CATEGORIES.find(c => c.id === activeCategory)?.label || "General"
          }
        });

        if (aiError || !evaluation) {
          console.error("AI Evaluation Failed:", aiError);
          toast.error("Could not generate AI score. Please try again.");
          // Do NOT use a random fallback. Set to 0 to indicate failure/invalidity.
        }

        console.log("AI Evaluation Result:", evaluation);

        // Use the actual AI score, or 0 if it failed/missing. 
        // We do NOT want to give free points for broken/spam sessions.
        const finalScore = evaluation?.score || 0;

        const { data, error } = await supabase
          .from("interview_sessions")
          .insert({
            user_id: user.id,
            interview_type: activeCategory, // Use the ID (lowercase) instead of Label
            status: "completed",
            // score: finalScore, // Removing score as column doesn't exist
            job_profile_id: null,
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase error:", error);
          toast.error(`Failed to save: ${error.message}`);
          setIsCompleting(false);
          setSessionActive(true);
          throw error;
        }

        toast.success(`Session Completed! Score: ${finalScore}%`);
        // Pass the real AI evaluation data to the results page
        navigate(`/interview/results/${data.id}`, {
          state: {
            score: finalScore,
            evaluation: evaluation // Pass full evaluation object
          }
        });
      }
    } catch (error: any) {
      console.error("Error saving session:", error);
      toast.error(error.message || "Could not save session");
      setIsCompleting(false);
      setSessionActive(true);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !sessionActive || isCompleting) return;

    const userMsg: Message = { role: "user", content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    // Generate next question based on updated history
    await generateAIQuestion(updatedMessages, questionCount);
  };

  // Removed auto-scroll useEffect as requested by user

  const toggleVoiceMode = () => {
    if (voiceMode) {
      stopListening();
      stopSpeaking();
      setVoiceMode(false);
    } else {
      // startListening(); // Uncomment if you want actual listening
      setVoiceMode(true);
      toast.success("Voice mode active");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed md:relative z-40 w-72 h-full border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col"
          >
            <div className="p-6 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
                <img src="/images/voke_logo.png" alt="Voke" className="w-8 h-8 object-contain" />
                <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Voke</span>
              </div>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* Interview Info Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-violet-500/20">
                      <MessageSquare className="w-5 h-5 text-violet-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">AI Interview</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Practice with our AI interviewer. Get real-time feedback and improve your skills.
                  </p>
                </div>

                {/* Tips Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Interview Tips
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0"></div>
                      <p className="text-xs text-muted-foreground">Be specific and provide concrete examples</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0"></div>
                      <p className="text-xs text-muted-foreground">Use the STAR method for behavioral questions</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0"></div>
                      <p className="text-xs text-muted-foreground">Take your time to think before answering</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/40 space-y-2">
              <ThemeToggle />
              <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-background">
        {/* Header */}
        <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">AI Interview</span>
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8 mt-1 border border-border shadow-sm">
                    <AvatarImage src="/ai-avatar-video.png" />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white">AI</AvatarFallback>
                  </Avatar>
                )}

                <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card border border-border/50 text-foreground rounded-tl-none"
                      }`}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>

                {message.role === "user" && (
                  <Avatar className="w-8 h-8 mt-1 border border-border">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}

            {/* Auto-navigation handles this now, but we can keep a loading state if needed */}
            {!sessionActive && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  Generating Results...
                </div>
              </motion.div>
            )}

            {sending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 justify-start">
                <Avatar className="w-8 h-8 mt-1 border border-border">
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white">AI</AvatarFallback>
                </Avatar>
                <div className="p-4 rounded-2xl rounded-tl-none bg-card border border-border/50 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/40">
          <div className="max-w-3xl mx-auto relative">
            {isFinished ? (
              <Button
                onClick={completeSession}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-primary/20"
                disabled={isCompleting}
              >
                {isCompleting ? "Generating Results..." : "Complete Interview & View Results"}
              </Button>
            ) : (
              <div className="relative flex items-end gap-2 p-2 bg-card border border-border/50 rounded-3xl shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <Button
                  size="icon"
                  variant="ghost"
                  className={`rounded-full h-10 w-10 shrink-0 ${voiceMode ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30' : 'text-muted-foreground'}`}
                  onClick={toggleVoiceMode}
                >
                  {voiceMode ? <Mic className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                </Button>

                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(input);
                    }
                  }}
                  placeholder={voiceMode ? "Listening..." : "Type your answer..."}
                  className="min-h-[44px] max-h-[120px] py-3 px-2 border-0 focus-visible:ring-0 bg-transparent resize-none shadow-none"
                  rows={1}
                  disabled={sending || !sessionActive || isCompleting}
                />

                <Button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || sending || !sessionActive || isCompleting}
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewNew;
