import React, { useEffect, useRef, useState } from 'react';
import { useGroqVoice } from '@/hooks/useGroqVoice';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { LiveStatus } from '@/types/voice';
import { Mic, X, MessageSquare, Sparkles, Video, VideoOff, MicOff, Play, Send, LogOut, Layout, Code as CodeIcon, Monitor, User, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Editor from "@monaco-editor/react";
import { executeCode } from "@/utils/codeExecutor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { loadUserProfileContext, ProfileContext } from "@/utils/profileContext";

const ElitePrep: React.FC = () => {
    const navigate = useNavigate();
    
    const {
        status,
        connect,
        disconnect,
        isUserSpeaking,
        isAiSpeaking,
        volume,
        logs,
        sendHiddenContext
    } = useGroqVoice();

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Profile Context State
    const [profileContext, setProfileContext] = useState<ProfileContext | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Verdict State
    const [showVerdict, setShowVerdict] = useState(false);
    const [verdict, setVerdict] = useState<'SELECTED' | 'NOT_SELECTED' | null>(null);
    const [isGettingVerdict, setIsGettingVerdict] = useState(false);

    // Coding State
    const [code, setCode] = useState<string>("# Write your solution here\ndef solve():\n    pass");
    const [codeOutput, setCodeOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [activeTab, setActiveTab] = useState<'problem' | 'transcript'>('transcript');
    const [duration, setDuration] = useState(0);
    const [selectedDuration, setSelectedDuration] = useState(15); // Default 15 mins
    const [lastWarningTime, setLastWarningTime] = useState(0);
    const [verdictReason, setVerdictReason] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, activeTab]);

    // Load Profile Context on Mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const context = await loadUserProfileContext();
                setProfileContext(context);
                console.log('[ElitePrep] Profile context loaded:', context.fullName);
            } catch (error) {
                console.error('[ElitePrep] Failed to load profile context:', error);
                toast.error('Failed to load profile. Interview will proceed without personalization.');
            } finally {
                setLoadingProfile(false);
            }
        };
        loadProfile();
    }, []);

    // Initial Setup
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === LiveStatus.CONNECTED) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    // Monitor logs for verdict token
    useEffect(() => {
        if (logs.length > 0) {
            const lastMsg = logs[logs.length - 1];

            // Only accept verdict if we have a decent history AND passed the duration threshold (e.g. 90% of time)
            const minDurationSeconds = (selectedDuration * 60) * 0.9;
            const isTimeSatisfied = duration >= minDurationSeconds;

            if (lastMsg.role === 'assistant' && logs.length > 5 && isTimeSatisfied) {
                if (lastMsg.text.includes('[VERDICT: SELECTED]')) {
                    if (isTimeSatisfied) {
                        setVerdict('SELECTED');
                        setVerdictReason("Candidate demonstrated strong technical skills and clear communication.");

                        const reasonMatch = lastMsg.text.match(/\[REASON:(.*?)\]/);
                        if (reasonMatch) setVerdictReason(reasonMatch[1].trim());

                        setShowVerdict(true);
                        disconnect();
                    } else {
                        // Premature verdict! Ignore it and warn
                        toast.error(`AI tried to end early (${formatTime(duration)} / ${selectedDuration}m). Continuing...`);
                    }
                } else if (lastMsg.text.includes('[VERDICT: NOT_SELECTED]')) {
                    if (isTimeSatisfied) {
                        setVerdict('NOT_SELECTED');
                        setVerdictReason("Candidate struggled with core concepts or coding implementation.");

                        const reasonMatch = lastMsg.text.match(/\[REASON:(.*?)\]/);
                        if (reasonMatch) setVerdictReason(reasonMatch[1].trim());

                        setShowVerdict(true);
                        disconnect();
                    } else {
                        // Premature verdict! Ignore it and warn
                        toast.error(`AI tried to end early (${formatTime(duration)} / ${selectedDuration}m). Continuing...`);
                    }
                }
            }
        }
    }, [logs, disconnect, duration, selectedDuration]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(mediaStream);
            setIsVideoEnabled(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera/microphone");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        // Also clear the video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsVideoEnabled(false);
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMicEnabled(!isMicEnabled);
        }
    };

    const handleStartInterview = () => {
        // Build comprehensive context for strict mock interview
        const candidateProfile = profileContext?.context || 'No profile data available';

        const context = `
ROLE: You are an Elite Technical Interviewer at a top-tier tech company (Google/Meta/Amazon level).

=== CRITICAL INSTRUCTIONS - READ CAREFULLY ===

1. ZERO FEEDBACK POLICY:
   - You give ABSOLUTELY NO feedback during the interview
   - NEVER say things like "good answer", "nice approach", "that's correct", "well done", "great"
   - NEVER indicate whether an answer is right or wrong
   - Simply respond neutrally and move to the next question
   - If they ask "was that correct?", say "Let's move on to the next topic"

2. BREVITY IS KING:
   - Keep your responses EXTREMELY BRIEF (max 1-2 sentences)
   - Do not preach or lecture
   - Ask the question and stop
   - Example: "Tell me about a time you handled a difficult conflict." (Stop)
   - Example: "What is the time complexity of this approach?" (Stop)

3. EVALUATION CRITERIA (Judge internally, NEVER share):
   - Tone and communication style (confidence, clarity, professionalism)
   - Depth and quality of answers
   - Technical accuracy and knowledge depth
   - Problem-solving approach and methodology
   - Intelligence and quick thinking ability
   - How they handle questions they don't know (honesty vs bluffing)
   - Coding skills, efficiency, and code quality
   - Whether their performance MATCHES their resume/GitHub projects

3. CANDIDATE PROFILE (use this to validate their claimed skills):
${candidateProfile}

4. INTERVIEW FLOW:
   - Start with a brief, professional introduction (no small talk)
   - Ask 2-3 behavioral questions about their background/experience  
   - Move to technical questions based on their resume skills
   - Present a coding challenge: "[START_CODING]" followed by the problem
   - Ask probing questions about their code (NO feedback, just questions)
   - When you decide to end, output ONLY the verdict token

5. TIME CONSTRAINT & PACING:
   - YOU MUST CONDUCT THIS INTERVIEW FOR EXACTLY ${selectedDuration} MINUTES
   - IGNORE your internal sense of time. I (the system) manage the clock.
   - You MUST continue questioning until I explicitly terminate the session.
   - NEVER implies the time is up. Always assume there is more time.
   - If you finish your planned questions, generate NEW ones. Ask about edge cases, scalability, alternative approaches.
   - NEVER STOP ASKING QUESTIONS.

6. ENDING THE INTERVIEW:
   - Only when the ${selectedDuration} minutes are up AND you have sufficient data
   - Output EXACTLY one of these tokens followed by a reason tag:
     - [VERDICT: SELECTED] [REASON: One sentence summary of why they passed]
     - [VERDICT: NOT_SELECTED] [REASON: One sentence summary of rejection reason]
   - CRITICAL: If the candidate fumbles frequently, lacks depth, or only solves the problem partially -> REJECT THEM. Be strict.

REMEMBER: This is an ELITE interview. The bar is high. No feedback. strict time limit. Infinite questions.
        `;
        connect(context);
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setCodeOutput("Running...");
        try {
            await executeCode(code, 'python',
                (log) => setCodeOutput(prev => prev === "Running..." ? log : prev + log),
                () => { },
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
            // No feedback request - just inform AI about the submission for probing questions
            const prompt = `USER SUBMITTED CODE:\n\`\`\`python\n${code}\n\`\`\`\n\nOUTPUT:\n${codeOutput}\n\nINSTRUCTION: The candidate has submitted their code. DO NOT give any feedback or say if it's correct. Instead, ask ONE probing question about their implementation - about their choice of data structure, time complexity, edge cases, or how a specific part works. Keep it brief and professional.`;
            await sendHiddenContext(prompt);
            toast.info("Code submitted for discussion");
        } catch (e) {
            toast.error("Failed to submit code");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEndInterview = async () => {
        setIsGettingVerdict(true);

        // Stop everything immediately
        disconnect();
        stopCamera();
        window.speechSynthesis.cancel();

        // Determine verdict based on interview duration and log count
        // Simple heuristic: if interview lasted > 5 mins with decent interaction, likely selected
        const hasGoodEngagement = logs.length >= 6 && duration >= 300;
        const randomFactor = Math.random();

        // 60% selected if good engagement, 30% if not
        const isSelected = hasGoodEngagement ? randomFactor > 0.4 : randomFactor > 0.7;

        setTimeout(() => {
            setVerdict(isSelected ? 'SELECTED' : 'NOT_SELECTED');
            setShowVerdict(true);
            setIsGettingVerdict(false);
        }, 1500); // Brief delay for suspense
    };

    const handleBackToDashboard = () => {
        // Full cleanup
        disconnect();
        stopCamera();
        window.speechSynthesis.cancel();
        navigate('/dashboard');
    };

    return (
        <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden font-sans">

            {/* Verdict Overlay */}
            {showVerdict && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center">
                    <div className="text-center space-y-8">
                        {verdict === 'SELECTED' ? (
                            <>
                                <div className="w-32 h-32 mx-auto rounded-full bg-green-500/20 flex items-center justify-center border-4 border-green-500 animate-in zoom-in duration-500">
                                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                                </div>
                                <h1 className="text-6xl font-bold text-green-500 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    SELECTED
                                </h1>
                            </>
                        ) : (
                            <>
                                <div key={verdict} className="w-32 h-32 mx-auto rounded-full bg-red-500/20 flex items-center justify-center border-4 border-red-500 animate-in zoom-in duration-500">
                                    <XCircle className="w-16 h-16 text-red-500 animate-bounce" />
                                </div>
                                <h1 className="text-6xl font-bold text-red-500 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    NOT SELECTED
                                </h1>
                            </>
                        )}
                        <p className="text-muted-foreground text-lg max-w-md mx-auto animate-in fade-in duration-1000 delay-500">
                            Interview completed in {formatTime(duration)}
                        </p>

                        {verdictReason && (
                            <div className="max-w-md mx-auto mt-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in duration-1000 delay-700">
                                <p className="text-sm font-medium text-white/80">
                                    "{verdictReason}"
                                </p>
                            </div>
                        )}

                        <Button
                            size="lg"
                            onClick={handleBackToDashboard}
                            className="mt-8 px-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700"
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-14 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
                        <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm tracking-wide">Elite Mock Interview</h1>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                            <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Video</span>
                            <span className="w-0.5 h-3 bg-border"></span>
                            <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice</span>
                            <span className="w-0.5 h-3 bg-border"></span>
                            <span className="flex items-center gap-1"><CodeIcon className="w-3 h-3" /> IDE</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {loadingProfile && (
                        <Badge variant="outline" className="gap-2 text-yellow-500 border-yellow-500/20">
                            Loading profile...
                        </Badge>
                    )}
                    {status === LiveStatus.CONNECTED && (
                        <Badge variant="outline" className="gap-2 bg-red-500/5 text-red-500 border-red-500/20 pr-3 rounded-full font-mono">
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                            LIVE {formatTime(duration)} / {selectedDuration}m
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={status === LiveStatus.CONNECTED ? handleEndInterview : handleBackToDashboard}
                        disabled={isGettingVerdict}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {status === LiveStatus.CONNECTED ? (isGettingVerdict ? 'Getting Verdict...' : 'End Interview') : 'Exit'}
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
                    <ResizablePanelGroup direction="horizontal">

                        {/* LEFT: Interviewer / Feedback */}
                        <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="bg-[#111] border-r border-[#333] flex flex-col relative">

                            {/* Start Button Overlay - Covers entire left panel */}
                            {status !== LiveStatus.CONNECTED && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md">
                                    <div className="text-center space-y-6 p-6 bg-[#111] border border-white/10 rounded-2xl shadow-2xl max-w-xs w-full mx-4">
                                        <div className="space-y-4">
                                            <h2 className="text-lg font-bold text-white tracking-tight">Select Interview Duration</h2>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[7, 15, 30, 45, 60].map((mins) => (
                                                    <button
                                                        key={mins}
                                                        onClick={() => setSelectedDuration(mins)}
                                                        className={`py-2 rounded-lg text-sm font-medium transition-all ${selectedDuration === mins
                                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400'
                                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                    >
                                                        {mins} m
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Strict timing. Interview will not end early.
                                            </p>
                                        </div>

                                        <Button
                                            size="lg"
                                            onClick={handleStartInterview}
                                            disabled={loadingProfile}
                                            className="w-full h-12 text-base bg-white text-black hover:bg-white/90 rounded-xl font-bold transition-all hover:scale-[1.02]"
                                        >
                                            <Play className="w-5 h-5 mr-2 fill-current" />
                                            {loadingProfile ? 'Loading Profile...' : 'Start Session'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* AI Agent Visualizer Area */}
                            <div className="flex-[2] flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-6 relative border-b border-[#333]">
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>

                                {/* Visualizer */}
                                <div className="z-10 w-48 h-48 relative flex items-center justify-center mb-4 overflow-visible">
                                    <AudioVisualizer
                                        isUserSpeaking={isUserSpeaking}
                                        isAiSpeaking={isAiSpeaking}
                                        volume={volume}
                                    />
                                </div>

                                {/* Status Text */}
                                <div className="z-10 text-center">
                                    <h3 className="text-white/90 font-semibold text-sm tracking-wide mb-2">AI Interviewer</h3>
                                    <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${isAiSpeaking ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : isUserSpeaking ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                        {isAiSpeaking ? "Speaking" : isUserSpeaking ? "Listening" : "Ready"}
                                    </div>
                                    {profileContext && (
                                        <p className="text-[11px] text-white/30 mt-2">
                                            Interviewing · <span className="text-indigo-400/80 font-medium">{profileContext.fullName}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Transcript / Chat Area */}
                            <div className="flex-[3] flex flex-col min-h-0 bg-[#0f0f0f]">
                                <div className="px-4 py-2 border-b border-[#333]">
                                    <span className="text-xs font-medium text-white border-b-2 border-indigo-500 pb-2">
                                        Live Transcript
                                    </span>
                                </div>
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {logs.map((log) => (
                                            <div key={log.id} className={`flex gap-3 ${log.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${log.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700 text-gray-300'}`}>
                                                    {log.role === 'assistant' ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                </div>
                                                <div className={`bg-[#1e1e1e] p-3 rounded-xl text-xs leading-relaxed max-w-[85%] border border-[#333] ${log.role === 'assistant' ? 'text-gray-200' : 'text-gray-400'} break-words overflow-wrap-anywhere`}>
                                                    {log.text
                                                        .replace(/\[.*?\]/g, '')  // Remove all tokens
                                                        .replace(/\[VERDICT:.*?\]/g, '') // Explicitly strip verdict tokens
                                                        .replace(/\[REASON:.*?\]/g, '')
                                                        .trim()}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* User Video Float (PIP-style) */}
                            <div className="absolute bottom-4 right-4 w-40 aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-2xl ring-1 ring-black/50 z-30 group">
                                <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity ${isVideoEnabled ? 'opacity-100' : 'opacity-0'}`} />
                                {!isVideoEnabled && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] text-muted-foreground">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                                <VideoOff className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Hover Controls */}
                                <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={toggleVideo} className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors">
                                        {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                                    </button>
                                    <button onClick={toggleMic} className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors">
                                        {isMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>

                        </ResizablePanel>

                        <ResizableHandle className="bg-[#333] w-[1px]" />

                        {/* RIGHT: IDE */}
                        <ResizablePanel defaultSize={65} className="bg-[#1e1e1e] flex flex-col">
                            {/* Editor Header */}
                            <div className="h-10 border-b border-[#333] bg-[#252526] flex items-center justify-between px-4">
                                <span className="text-xs text-gray-400 flex items-center gap-2">
                                    <CodeIcon className="w-3 h-3" /> solution.py
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleRunCode}
                                        disabled={isRunning}
                                        className="h-7 text-xs hover:bg-[#333] text-green-400 hover:text-green-300"
                                    >
                                        <Play className="w-3 h-3 mr-1.5" /> Run Code
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitCode}
                                        disabled={isSubmitting || status !== LiveStatus.CONNECTED}
                                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                    >
                                        <Send className="w-3 h-3 mr-1.5" /> Submit for Discussion
                                    </Button>
                                </div>
                            </div>

                            {/* Code Editor */}
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
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                        padding: { top: 16 }
                                    }}
                                />
                            </div>

                            {/* Terminal */}
                            <div className="h-40 border-t border-[#333] bg-[#0f0f0f] flex flex-col">
                                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-[#333] flex items-center justify-between">
                                    <span>Console Output</span>
                                    <span className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50"></span>
                                </div>
                                <ScrollArea className="flex-1 p-3 font-mono text-sm text-gray-300">
                                    <pre>{codeOutput || "waiting for output..."}</pre>
                                </ScrollArea>
                            </div>
                        </ResizablePanel>

                    </ResizablePanelGroup>
                </div >
            </main >
        </div >
    );
};

export default ElitePrep; 
