import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { loadUserProfileContext } from "@/utils/profileContext";
import {
  AlertTriangle,
  Award,
  Bot,
  CheckCircle2,
  Clock,
  LogOut,
  Send,
  StopCircle,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// Basic message shape for the text interview
interface Message {
  role: "assistant" | "user";
  content: string;
}

// Fallback first question if the AI backend is unavailable
const INITIAL_QUESTION: Message = {
  role: "assistant",
  content:
    "Welcome! Let's begin with a classic interview question: Tell me about yourself.",
};

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userContext, setUserContext] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState(location.state?.config || {
    topic: "General",
    difficulty: "Intermediate",
    mode: "text",
  });

  // Treat "sending" as when the AI is "speaking" for UI effects
  const isSpeaking = sending;

  // Derive a simple progress estimate based on number of AI turns
  const assistantTurns = messages.filter(m => m.role === "assistant").length;
  const progressPercent = Math.min(100, Math.round((assistantTurns / 5) * 100));

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        setUserId(user.id);
        setLoading(false);
        setSending(true);

        // Load profile context
        try {
          const profileContext = await loadUserProfileContext();
          setUserContext(profileContext.context);
          console.log('[InterviewSession] Profile context loaded');
        } catch (error) {
          console.error('[InterviewSession] Error loading profile context:', error);
        }

        // Ask the AI to start the interview and pose the first question
        const { data, error } = await supabase.functions.invoke("adaptive-interview-chat", {
          body: {
            userId: user.id,
            userContext: userContext, // Include profile context
            messages: [
              {
                role: "user",
                content: "Start the interview and ask me the first question.",
              },
            ],
          },
        });

        if (error) {
          console.error("Error starting adaptive interview:", error);
          toast.error("AI interviewer is unavailable, starting with a default question.");
          setMessages([INITIAL_QUESTION]);
        } else if (data?.content) {
          setMessages([{ role: "assistant", content: data.content }]);
        } else {
          // No content returned – still show a sensible first question
          setMessages([INITIAL_QUESTION]);
        }
      } finally {
        setSending(false);
      }
    };

    init();

    const timer = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fallback formatter used if the AI backend is unavailable
  const buildFallbackFeedback = (question: string | null, answer: string): string => {
    const safeQuestion = question || "the interview question";

    return `### ✅ What You Did Well
- You provided a thoughtful answer in your own words.
- You attempted to connect your experience to the question.

### ⚠️ Areas to Improve
- Be more specific and concrete; include technologies, numbers, or clear outcomes.
- Use a clear structure like STAR (Situation, Task, Action, Result).
- Explicitly call out what *you* did versus what the team did.

### 📝 Model Answer
Here is an example of a strong answer to "${safeQuestion}":

I recently worked on a challenging project where [...brief context]. The main challenge was [...key problem]. My responsibility was to [...your role]. To solve this, I first [...step 1], then [...step 2], and finally [...step 3]. As a result, we achieved [...measurable result such as performance improvement, revenue impact, or user metric].

Notice how this answer clearly explains the context, your specific actions, and a concrete result.

### 🎯 Skill Gap Analysis
- Storytelling and structuring answers
- Highlighting measurable impact
- Communicating your individual contribution

### ❓ Next Question
Tell me about a time you had to learn something quickly in order to deliver on a tight deadline. What did you do and what was the outcome?`;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || sending || !userId) return;

    // Add user message locally
    const userMsg: Message = { role: "user", content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    // Last assistant turn (used if we need to build a local fallback)
    const lastAssistant = [...updatedMessages].reverse().find(m => m.role === "assistant") || null;
    const lastQuestion = lastAssistant?.content ?? null;

    try {
      const { data, error } = await supabase.functions.invoke("adaptive-interview-chat", {
        body: {
          userId,
          userContext, // Include profile context for personalized questions
          messages: updatedMessages,
        },
      });

      if (error) {
        console.error("Error contacting AI interviewer:", error);
        toast.error("AI feedback is temporarily unavailable. Showing a generic review instead.");
        const fallbackContent = buildFallbackFeedback(lastQuestion, content);
        const aiMsg: Message = { role: "assistant", content: fallbackContent };
        setMessages(prev => [...prev, aiMsg]);
        return;
      }

      if (data?.content) {
        const aiMsg: Message = { role: "assistant", content: data.content };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // No content from backend – still respond with a useful fallback
        const fallbackContent = buildFallbackFeedback(lastQuestion, content);
        const aiMsg: Message = { role: "assistant", content: fallbackContent };
        setMessages(prev => [...prev, aiMsg]);
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Preparing your interview environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - AI Persona & Stats */}
      <aside className="w-80 border-r border-border/40 bg-card/30 backdrop-blur-xl hidden md:flex flex-col relative z-20">
        <div className="p-6 flex flex-col items-center border-b border-border/40">
          <div className="relative mb-6">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/20 ${isSpeaking ? 'animate-pulse scale-105' : ''} transition-all duration-500`}>
              <Bot className="w-16 h-16 text-white" />
            </div>
            {/* Audio Visualizer Ring */}
            {(isSpeaking || sending) && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/30 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/50 animate-[spin_3s_linear_infinite]" />
              </>
            )}
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Voke AI
          </h2>
          <Badge variant="outline" className="mt-2 border-violet-500/30 text-violet-600 bg-violet-500/5">
            {config.topic} Expert
          </Badge>

          <div className="mt-8 w-full space-y-4">
            <div className="flex items-center justify-between text-sm p-4 rounded-xl bg-background/50 border border-border/50 shadow-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time
              </span>
              <span className="font-mono font-bold text-lg">{formatTime(elapsedTime)}</span>
            </div>

            <div className="p-4 rounded-xl bg-background/50 border border-border/50 shadow-sm space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-end">
          <div className="space-y-3">
            <Button onClick={() => setShowResults(true)} variant="destructive" className="w-full justify-start h-12 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0">
              <StopCircle className="w-5 h-5 mr-3" />
              End Session
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-background via-background to-violet-500/5">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border/40 bg-background/80 backdrop-blur-md p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img
              src="/images/voke_logo.png"
              alt="Voke Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold">Voke AI</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowResults(true)}>
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-8 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-10 h-10 border border-border mt-1 shrink-0 shadow-sm">
                      <AvatarImage src="/ai-avatar-video.png" />
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white">AI</AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`p-5 rounded-2xl shadow-sm leading-relaxed ${message.role === "user"
                        ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-none shadow-violet-500/10"
                        : "bg-card border border-border/50 text-foreground rounded-tl-none"
                        }`}
                    >
                      <div className={`prose prose-sm max-w-none ${message.role === "user"
                        ? "prose-invert text-white"
                        : "dark:prose-invert text-foreground"
                        }`}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="w-10 h-10 border border-border mt-1 shrink-0">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {sending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 justify-start"
              >
                <Avatar className="w-10 h-10 border border-border mt-1 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white">AI</AvatarFallback>
                </Avatar>
                <div className="p-4 rounded-2xl rounded-tl-none bg-card border border-border/50 shadow-sm">
                  <div className="flex gap-1.5 items-center h-6 px-2">
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t border-border/40">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative flex items-end gap-2 p-2 bg-card border border-border/50 rounded-3xl shadow-lg shadow-black/5 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                placeholder="Type your answer here..."
                className="min-h-[44px] max-h-[120px] py-3 px-2 border-0 focus-visible:ring-0 bg-transparent resize-none shadow-none"
                rows={1}
                disabled={sending}
              />

              <Button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || sending}
                size="icon"
                className={`rounded-full h-10 w-10 shrink-0 transition-all duration-300 ${input.trim()
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                  : 'bg-muted text-muted-foreground'
                  }`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-500" />
              Interview Completed
            </DialogTitle>
            <DialogDescription>
              Here's a summary of your performance in this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center p-6 bg-muted/30 rounded-xl border border-border/50">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  85/100
                </div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Strengths
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Strong understanding of React fundamentals</li>
                  <li>Clear communication of technical concepts</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Areas for Improvement
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Could elaborate more on accessibility edge cases</li>
                  <li>Consider discussing trade-offs in system design answers</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate("/interview/new")} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              Start New Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
