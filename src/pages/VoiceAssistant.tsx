import React, { useEffect, useRef, useState } from 'react';
import { useGroqVoice } from '@/hooks/useGroqVoice';
import { AudioVisualizerSimple } from '@/components/AudioVisualizerSimple';
import { LiveStatus, MessageLog } from '@/types/voice';
import { Mic, X, MessageSquare, Sparkles, AlertCircle, ArrowLeft, Code, Play, Send, Maximize2, Minimize2, FileText, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Editor from "@monaco-editor/react";
import { executeCode } from "@/utils/codeExecutor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ReactMarkdown from 'react-markdown';

const VoiceAssistant: React.FC = () => {
    const navigate = useNavigate();
    const {
        status,
        connect,
        disconnect,
        isUserSpeaking,
        isAiSpeaking,
        volume,
        logs,
        errorDetails,
        sendHiddenContext
    } = useGroqVoice();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [userContext, setUserContext] = useState<string>('');
    const [loadingContext, setLoadingContext] = useState(true);
    const [interviewMode, setInterviewMode] = useState<'voice' | 'coding'>('voice');

    // Coding State
    const [code, setCode] = useState<string>("# Write your solution here\ndef solve():\n    pass");
    const [codeOutput, setCodeOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [problemStatement, setProblemStatement] = useState<string>("Waiting for problem statement...");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detailed Feedback State
    const [feedback, setFeedback] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    // Monitor logs for transition tokens and feedback
    useEffect(() => {
        if (logs.length > 0) {
            const lastMsg = logs[logs.length - 1];
            if (lastMsg.role === 'assistant') {

                // Handle START_CODING
                if (lastMsg.text.includes('[START_CODING]')) {
                    if (interviewMode !== 'coding') {
                        console.log("Transitioning to CODING mode");
                        setInterviewMode('coding');

                        const text = lastMsg.text.replace('[START_CODING]', '').trim();
                        // Clean up other tokens just in case
                        const cleanText = text.replace(/\[.*?\]/g, '').trim();
                        setProblemStatement(cleanText || "Listen to the interviewer for the problem statement.");
                        toast.info("Coding Phase Started!");
                    }
                }

                // Handle END_CODING
                if (lastMsg.text.includes('[END_CODING]')) {
                    if (interviewMode !== 'voice') {
                        console.log("Transitioning back to VOICE mode");
                        setInterviewMode('voice');
                        toast.success("Coding phase completed. Switching back to voice.");
                    }
                }

                // Handle DETAILED_FEEDBACK
                if (lastMsg.text.includes('[DETAILED_FEEDBACK]')) {
                    const parts = lastMsg.text.split('[DETAILED_FEEDBACK]');
                    if (parts.length > 1) {
                        const feedbackContent = parts[1].trim();
                        setFeedback(feedbackContent);
                        // Optional: automatically show feedback panel or toast
                        toast("New feedback available!", {
                            action: {
                                label: "View",
                                onClick: () => console.log("Feedback clicked") // Could open a modal
                            }
                        });
                    }
                }
            }
        }
    }, [logs, interviewMode]);

    useEffect(() => {
        loadUserContext();
    }, []);

    const [duration, setDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (status === LiveStatus.CONNECTED) {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [status]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const loadUserContext = async () => {
        try {
            console.log('[VoiceAssistant] Starting loadUserContext...');
            const { data: { user } } = await supabase.auth.getUser();
            console.log('[VoiceAssistant] User:', user?.id);

            if (!user) {
                console.error('[VoiceAssistant] No user found, redirecting to auth');
                navigate('/auth');
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                let context = `User Name: ${profile.full_name || 'Candidate'}\n`;

                if (profile.github_url) {
                    try {
                        const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
                        const usernameMatch = profile.github_url.match(/github\.com\/([^\/]+)/);
                        if (usernameMatch) {
                            const username = usernameMatch[1];
                            const headers: Record<string, string> = {
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'Voke-Interview-App'
                            };
                            if (githubToken) headers['Authorization'] = `token ${githubToken}`;

                            const reposResponse = await fetch(
                                `https://api.github.com/users/${username}/repos?sort=updated&per_page=3`,
                                { headers }
                            );

                            if (reposResponse.ok) {
                                const repos = await reposResponse.json();
                                const projectSummaries = await Promise.all(
                                    repos.map(async (repo: any) => {
                                        return `Project: ${repo.name}\n- Description: ${repo.description || 'No description'}\n- Tech: ${repo.language || 'Not specified'}`;
                                    })
                                );
                                context += `\nGITHUB PROJECTS:\n${projectSummaries.join('\n\n')}\n`;
                            }
                        }
                    } catch (e) {
                        console.error('GitHub fetch failed', e);
                    }
                }

                context += `\nINSTRUCTION: You are conducting a technical interview. Start with introductions and behavioral questions. When you feel ready to test their coding skills, say "[START_CODING]" and present a problem.`;
                setUserContext(context);
            }
        } catch (error) {
            console.error('[VoiceAssistant] Error loading context:', error);
            toast.error('Failed to load profile context');
            setUserContext('User Name: Candidate\nINSTRUCTION: Greet the user and ask them a creative, unconventional interview question.');
        } finally {
            setLoadingContext(false);
        }
    };

    const handleEndInterview = async () => {
        if (logs.length === 0) {
            toast.error("No conversation to analyze yet.");
            return;
        }

        disconnect();
        const toastId = toast.loading("Saving session...");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const { data, error } = await supabase
                .from('interview_sessions')
                .insert({
                    user_id: user.id,
                    role: 'Voice Interviewer',
                    time_limit_minutes: 0,
                    status: 'completed',
                    interview_type: 'voice',
                    interview_mode: 'voice', // could update to 'mixed' if coding happened
                    transcript: logs,
                    total_duration_seconds: duration,
                    created_at: new Date().toISOString()
                } as any)
                .select()
                .single();

            if (error) throw error;

            toast.loading("Analyzing session...", { id: toastId });

            // Trigger analysis (Assuming there is an Edge Function for this)
            try {
                await supabase.functions.invoke('evaluate-interview', {
                    body: { session_id: data.id }
                });
            } catch (evalError) {
                console.error("Evaluation trigger failed:", evalError);
                // Continue anyway so user can see what IS there
            }

            toast.dismiss(toastId);
            toast.success("Session saved!");
            navigate(`/voice-interview/results/${data.id}`);

        } catch (error: any) {
            console.error("Error saving session:", error);
            toast.dismiss(toastId);
            toast.error(`Failed to save session: ${error.message}`);
        }
    };

    const handleConnect = () => {
        connect(userContext);
    };

    // Code Execution
    const handleRunCode = async () => {
        setIsRunning(true);
        setCodeOutput("Running...");
        try {
            await executeCode(code, 'python',
                (log) => setCodeOutput(prev => prev === "Running..." ? log : prev + log),
                () => { }, // No input support for now in this mini-editor
                ""
            );
        } catch (err: any) {
            setCodeOutput(`Error: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmitCode = async () => {
        setIsSubmitting(true);
        try {
            const prompt = `USER SUBMITTED CODE:\n\`\`\`python\n${code}\n\`\`\`\n\nOUTPUT:\n${codeOutput}\n\nINSTRUCTION: Review this code. Do NOT simply accept it or say it's correct. Ask a SOCRATIC QUESTION about their implementation choices, efficiency, or potential bugs. engage in a discussion.`;
            await sendHiddenContext(prompt);
            toast.success("Code submitted for discussion!");
        } catch (e) {
            toast.error("Failed to submit code");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isError = status === LiveStatus.ERROR;
    const isConnected = status === LiveStatus.CONNECTED;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

            {/* Header / Nav */}
            <div className="absolute top-4 left-4 z-50">
                <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="z-10 flex-1 flex flex-col">

                {interviewMode === 'voice' ? (
                    // === VOICE MODE LAYOUT ===
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-md flex flex-col gap-6">
                            {/* Header Info */}
                            <div className="text-center space-y-2">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
                                        <Sparkles className="w-3 h-3 text-purple-400" />
                                        <span>AI Interviewer</span>
                                    </div>
                                    {status === LiveStatus.CONNECTED && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground font-mono">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    )}
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">Voice Interview</h1>
                                <p className="text-muted-foreground text-sm">
                                    {loadingContext ? "Loading profile..." : "Ready to interview you based on your profile."}
                                </p>
                            </div>

                            {/* Visualizer */}
                            <div className="relative bg-card/50 border border-border rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl transition-all duration-500 min-h-[320px]">
                                {status === LiveStatus.CONNECTING && (
                                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/80 backdrop-blur-sm">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium text-muted-foreground">Connecting...</span>
                                        </div>
                                    </div>
                                )}
                                <AudioVisualizerSimple
                                    isUserSpeaking={isUserSpeaking}
                                    isAiSpeaking={isAiSpeaking}
                                    volume={volume}
                                />
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-6 mb-6">
                                {!isConnected ? (
                                    <button
                                        onClick={handleConnect}
                                        disabled={status === LiveStatus.CONNECTING || loadingContext}
                                        className="group relative flex items-center justify-center w-20 h-20 bg-primary hover:bg-primary/90 rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:scale-110 transition-transform duration-300"></div>
                                        <Mic className="w-8 h-8 text-primary-foreground" />
                                    </button>
                                ) : (
                                    <div className="flex gap-4">
                                        <button onClick={disconnect} className="group relative flex items-center justify-center w-16 h-16 bg-muted hover:bg-muted/80 rounded-full shadow-lg transition-all duration-300">
                                            <X className="w-6 h-6 text-foreground" />
                                        </button>
                                        <button onClick={handleEndInterview} className="group relative flex items-center justify-center w-20 h-20 bg-destructive hover:bg-destructive/90 rounded-full shadow-lg hover:shadow-destructive/25 transition-all duration-300">
                                            <MessageSquare className="w-8 h-8 text-destructive-foreground" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Transcript Display */}
                            <div className="w-full max-h-48 overflow-y-auto mb-4 p-4 rounded-xl bg-background/50 backdrop-blur border border-white/10 shadow-inner">
                                <div className="space-y-3">
                                    {logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`
                                                max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm
                                                ${log.role === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-muted text-muted-foreground rounded-bl-sm'
                                                }
                                            `}>
                                                {log.text.replace('[START_CODING]', '').replace('[END_CODING]', '').split('[DETAILED_FEEDBACK]')[0]}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Feedback Display (Voice Mode) */}
                            {feedback && (
                                <div className="mt-6 w-full bg-card/80 border border-green-500/30 rounded-xl p-4 animate-in slide-in-from-bottom-5">
                                    <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Feedback from Last Challenge
                                    </h3>
                                    <ScrollArea className="h-32 rounded bg-black/20 p-2">
                                        <div className="prose prose-invert prose-sm">
                                            <ReactMarkdown>{feedback}</ReactMarkdown>
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // === CODING MODE LAYOUT ===
                    <div className="flex-1 flex flex-col h-screen pt-16 px-4 pb-4 gap-4">
                        <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                            {/* Left Panel: Problem & Chat */}
                            <ResizablePanel defaultSize={30} minSize={20} className="flex flex-col border-r border-border bg-[#1e1e1e]">
                                <div className="p-4 border-b border-border bg-[#252526]">
                                    <h2 className="font-semibold text-white flex items-center gap-2">
                                        <Code className="w-4 h-4 text-blue-400" />
                                        Coding Challenge
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-auto p-4 text-sm text-gray-300 font-sans leading-relaxed">
                                    <div className="space-y-4">
                                        {!feedback ? (
                                            <>
                                                <div className="font-medium text-indigo-300">Problem Statement:</div>
                                                <p className="whitespace-pre-wrap">{problemStatement}</p>
                                            </>
                                        ) : (
                                            <div className="bg-green-900/10 border border-green-500/20 p-3 rounded">
                                                <div className="font-medium text-green-400 mb-2">Previous Feedback:</div>
                                                <div className="prose prose-invert prose-xs">
                                                    <ReactMarkdown>{feedback}</ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 border-t border-white/10 pt-4">
                                        <div className="font-medium text-indigo-300 mb-2">Transcript:</div>
                                        <div className="flex flex-col gap-2 opacity-70">
                                            {logs.slice(-5).map((msg) => (
                                                <div key={msg.id} className={`text-xs p-2 rounded ${msg.role === 'user' ? 'bg-indigo-500/20 self-end' : 'bg-gray-700/50 self-start'}`}>
                                                    <span className="font-bold opacity-50 block mb-0.5">{msg.role === 'user' ? 'You' : 'Interviewer'}:</span>
                                                    {msg.text
                                                        .replace('[START_CODING]', '')
                                                        .replace('[END_CODING]', '')
                                                        .split('[DETAILED_FEEDBACK]')[0]
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle />

                            {/* Right Panel: Code Editor */}
                            <ResizablePanel defaultSize={70} className="flex flex-col bg-[#1e1e1e]">
                                <div className="h-10 bg-[#252526] flex items-center justify-between px-4 border-b border-border">
                                    <span className="text-xs text-gray-400">main.py</span>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:text-green-300 hover:bg-green-500/10" onClick={handleRunCode} disabled={isRunning}>
                                            <Play className="w-3 h-3" /> Run
                                        </Button>
                                        <Button size="sm" className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white border-none" onClick={handleSubmitCode} disabled={isSubmitting}>
                                            <Send className="w-3 h-3" /> Submit & Discuss
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 relative">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="python"
                                        theme="vs-dark"
                                        value={code}
                                        onChange={(val) => setCode(val || "")}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            padding: { top: 16 }
                                        }}
                                    />
                                </div>
                                {/* Terminal / Output */}
                                <div className="h-32 bg-[#0f0f0f] border-t border-[#333] flex flex-col">
                                    <div className="px-4 py-1.5 text-xs text-gray-500 font-mono border-b border-[#333]">Output</div>
                                    <ScrollArea className="flex-1 p-3 font-mono text-sm text-gray-300">
                                        <pre>{codeOutput || "Run code to see output..."}</pre>
                                    </ScrollArea>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>

                        {/* Sticky Voice Control Bar (Mini) */}
                        <div className="h-16 bg-card border border-border rounded-xl flex items-center px-4 justify-between shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                <div className="text-sm font-medium">Live Interview</div>
                                <div className="text-xs text-muted-foreground font-mono">{formatTime(duration)}</div>
                            </div>

                            <div className="flex-1 max-w-xs mx-4 h-8 bg-black/20 rounded-lg overflow-hidden relative">
                                {/* Mini Visualizer */}
                                <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                                    {/* Simplified visualizer bars */}
                                    {[...Array(10)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 bg-indigo-500/80 rounded"
                                            style={{
                                                height: Math.max(4, Math.random() * (volume * 100)) + 'px',
                                                opacity: 0.5 + (volume * 0.5)
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleEndInterview}
                                    className="gap-2 px-4 shadow-md hover:shadow-red-500/20 transition-all hover:scale-105 font-semibold tracking-wide"
                                >
                                    <LogOut className="w-4 h-4" />
                                    End Interview
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceAssistant;
