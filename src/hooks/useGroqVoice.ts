import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Groq from 'groq-sdk';
import { LiveStatus, MessageLog } from '../types/voice';
import { toast } from 'sonner';

const SYSTEM_INSTRUCTION = `YOU ARE:
A real-time voice-based conversational assistant designed to conduct a professional yet friendly interview.

1. Core Personality & Speaking Style
- Speak in a friendly, warm, and natural tone.
- Keep responses concise (1-3 sentences max) unless asked for detail.
- Use spoken-language style (short sentences, natural fillers).
- Never sound robotic or overly formal.

2. Interaction Rules
- Respond quickly.
- If unclear, ask "Could you repeat that?".
- Do not mention you are an AI unless asked.

3. INTERVIEW FLOW & CODING CHALLENGE (IMPORTANT):
- Start with 2-3 behavioral or technical screening questions based on their background.
- Once you are satisfied with the verbal screening, say exactly: "[START_CODING]" followed by a brief intro to the coding problem.
- DO NOT ask "Are you ready for a coding challenge?". Just announce it naturally like "Great, let's move on to a practical problem. [START_CODING] I'd like you to solve..." giving a brief 1-sentence summary of the task.

4. DURING CODING:
- When the user submits code, DO NOT just give the answer or say "Correct".
- Use **Socratic Questioning**: Ask probing questions about their choices. Examples:
    - "Why did you choose this data structure?"
    - "How does this handle edge case X?"
    - "Can you explain the time complexity?"
- If the code is buggy, ask: "Walk me through your logic for [specific part]. What happens if input is X?"

5. ENDING CODING & FEEDBACK:
- Once you are satisfied with the coding discussion (or if user asks to stop), you MUST provide:
    - Spoken transition: "Excellent work on that. Let's move on."
    - Token: "[END_CODING]" (to switch back to voice mode).
    - Detailed Feedback (Hidden from speech): "[DETAILED_FEEDBACK]" followed by a structured Markdown summary of their code quality, correct logic, and areas for improvement.

Example Output when finishing coding:
"That was a great solution. [END_CODING] Let's discuss your experience with..."
[DETAILED_FEEDBACK]
### Code Review
- **Logic**: Correct approach using Hash Map.
- **Style**: Good variable naming, but missed type hints.
- **Optimization**: O(n) is optimal.
`;

interface UseGroqVoiceReturn {
    status: LiveStatus;
    connect: (context?: string) => Promise<void>;
    disconnect: () => void;
    isUserSpeaking: boolean;
    isAiSpeaking: boolean;
    volume: number;
    logs: MessageLog[];
    errorDetails: string | null;
    sendHiddenContext: (text: string) => Promise<void>;
}

interface UseGroqVoiceProps {
    apiKey?: string;
}

export function useGroqVoice(props?: UseGroqVoiceProps): UseGroqVoiceReturn {
    const [status, setStatus] = useState<LiveStatus>(LiveStatus.DISCONNECTED);
    const [groqClient, setGroqClient] = useState<Groq | null>(null);

    useEffect(() => {
        const apiKey = props?.apiKey || import.meta.env.VITE_GROQ_API_KEY;
        if (apiKey) {
            setGroqClient(new Groq({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            }));
        } else {
            console.warn("Groq API Key missing. Voice unavailable.");
        }
    }, [props?.apiKey]);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);
    const [logs, setLogs] = useState<MessageLog[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const contextRef = useRef<string>('');
    const conversationHistoryRef = useRef<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([]);
    const statusRef = useRef(status);
    const isAiSpeakingRef = useRef(isAiSpeaking);
    const isListeningRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        statusRef.current = status;
        isAiSpeakingRef.current = isAiSpeaking;
    }, [status, isAiSpeaking]);

    // Forward declaration for use in speakResponse
    const startListeningRef = useRef<() => Promise<void>>();

    // Helper to send messages to Groq
    const sendToGroq = async (fullMessages: any[]) => {
        if (!groqClient) {
            const errorText = "I cannot process your request because my API key is missing.";
            speakResponse(errorText);
            return;
        }

        let completion;
        try {
            completion = await groqClient.chat.completions.create({
                messages: fullMessages,
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 800, // Increased for detailed feedback
            });
        } catch (error: any) {
            // Level 1 Fallback: Llama 3.1 8B
            if (error?.status === 429) {
                console.log('DEBUG: Rate limit on 70b, waiting 1s and switching to 8b...');
                // toast.warning("Optimizing connection (1/2)..."); 
                await new Promise(resolve => setTimeout(resolve, 1000));

                try {
                    completion = await groqClient.chat.completions.create({
                        messages: fullMessages,
                        model: 'llama-3.1-8b-instant',
                        temperature: 0.7,
                        max_tokens: 800,
                    });
                } catch (retryError: any) {
                    // Level 2 Fallback: Mixtral
                    if (retryError?.status === 429) {
                        console.log('DEBUG: Rate limit on 8b, waiting 2s and switching to Mixtral...');
                        // toast.warning("Optimizing connection (2/2)...");
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        completion = await groqClient.chat.completions.create({
                            messages: fullMessages,
                            model: 'mixtral-8x7b-32768',
                            temperature: 0.7,
                            max_tokens: 800,
                        });
                    } else {
                        throw retryError;
                    }
                }
            } else {
                throw error;
            }
        }

        const aiText = completion.choices[0]?.message?.content || "I didn't catch that.";
        console.log('DEBUG: Groq response:', aiText);

        const aiMsg: MessageLog = {
            id: Date.now().toString() + '-ai',
            role: 'assistant',
            text: aiText,
            timestamp: new Date(),
        };
        setLogs(prev => [...prev, aiMsg]);
        conversationHistoryRef.current.push({ role: 'assistant', content: aiText });

        speakResponse(aiText);
    }

    const speakResponse = async (text: string) => {
        if (!text) return;

        // Strip out tokens and hidden content for speech
        let speechText = text
            .replace('[START_CODING]', '')
            .replace('[END_CODING]', '');

        // Remove detailed feedback content (everything after the token)
        if (speechText.includes('[DETAILED_FEEDBACK]')) {
            speechText = speechText.split('[DETAILED_FEEDBACK]')[0];
        }

        speechText = speechText.trim();

        try {
            console.log('DEBUG: Generating speech with Local macOS TTS...');
            setIsAiSpeaking(true);
            setVolume(0.8);

            // Call local TTS server
            const response = await fetch('http://localhost:5001', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: speechText }),
            });

            if (!response.ok) {
                throw new Error(`TTS Server error: ${response.statusText}`);
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);

            // STOP: Check if we are still connected before playing
            if (statusRef.current !== LiveStatus.CONNECTED) {
                console.log('DEBUG: Disconnected while generating speech, cancelling playback.');
                URL.revokeObjectURL(audioUrl);
                return;
            }

            // Play the audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                console.log('DEBUG: Audio started');
            };

            audio.onended = () => {
                console.log('DEBUG: Audio finished');
                setIsAiSpeaking(false);
                setVolume(0);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;

                // Resume listening after speaking
                if (statusRef.current === LiveStatus.CONNECTED && startListeningRef.current) {
                    setTimeout(() => startListeningRef.current!(), 500);
                }
            };

            audio.onerror = (e) => {
                console.error("DEBUG: Audio playback error:", e);
                setIsAiSpeaking(false);
                setVolume(0);
                audioRef.current = null;
            };

            console.log('DEBUG: Playing audio for:', speechText);
            await audio.play();

        } catch (error) {
            console.error('DEBUG: Local TTS error:', error);
            setIsAiSpeaking(false);
            setVolume(0);

            // Fallback to browser TTS
            console.log('DEBUG: Falling back to browser TTS');
            window.speechSynthesis.cancel(); // Cancel any previous speech
            const utterance = new SpeechSynthesisUtterance(speechText);
            utterance.onend = () => {
                setIsAiSpeaking(false);
                if (statusRef.current === LiveStatus.CONNECTED && startListeningRef.current) {
                    setTimeout(() => startListeningRef.current!(), 500);
                }
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
        try {
            console.log('DEBUG: Transcribing audio with Groq Whisper...');

            // Convert blob to File
            const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

            if (!groqClient) {
                console.error('DEBUG: Groq client not initialized (missing API key)');
                toast.error("Voice Error: Groq API Key missing");
                return '';
            }

            const transcription = await groqClient.audio.transcriptions.create({
                file: audioFile,
                model: 'whisper-large-v3-turbo', // Reverting to turbo as distil is decommissioned
                temperature: 0,
                response_format: 'verbose_json',
            });

            console.log('DEBUG: Transcription:', transcription.text);

            if (!transcription.text) {
                toast.warning("Hears silence (empty transcript)");
            }

            return transcription.text || '';
        } catch (error: any) {
            console.error('DEBUG: Whisper transcription error:', error);
            toast.error(`Transcription Failed: ${error.message}`);
            return '';
        }
    };

    const handleUserMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: MessageLog = {
            id: Date.now().toString() + '-user',
            role: 'user',
            text: text,
            timestamp: new Date(),
        };
        setLogs(prev => [...prev, userMsg]);
        conversationHistoryRef.current.push({ role: 'user', content: text });

        try {
            console.log('DEBUG: Sending to Groq...');

            const messages = [
                { role: 'system', content: SYSTEM_INSTRUCTION + '\n\nCONTEXT:\n' + contextRef.current },
                ...conversationHistoryRef.current
            ];

            console.log('DEBUG: Full messages being sent:', JSON.stringify(messages, null, 2));
            await sendToGroq(messages);

        } catch (error: any) {
            console.error('DEBUG: Groq API Error:', error);

            // Detailed Error Handling
            let errorMessage = "I'm having trouble connecting to my brain right now.";

            if (error?.status === 401) {
                errorMessage = "My API key is missing or invalid. Please check your configuration.";
                toast.error("Groq API Error: 401 Unauthorized. Please check VITE_GROQ_API_KEY in .env");
            } else if (error?.status === 404) {
                errorMessage = "I can't access the AI model. It might be unavailable.";
                toast.error("Groq API Error: 404 Model Not Found. The model may differ or be deprecated.");
            } else if (error?.status === 429) {
                errorMessage = "My brain is tired. Please give me a minute to rest.";
                toast.error("Groq Rate Limit Exceeded (429). Please wait a moment or upgrade plan.");
            } else {
                toast.error(`Voice Interview Error: ${error.message || "Unknown error"}`);
            }

            speakResponse(errorMessage);
        }
    };

    const sendHiddenContext = async (text: string) => {
        console.log('DEBUG: Sending hidden context to Groq:', text);

        // Add as system or user message but NOT to logs
        const contextMsg = { role: 'system' as const, content: `[HIDDEN CONTEXT]: ${text}` };

        // We push to history so AI remembers it, but we DO NOT add to 'logs' state
        conversationHistoryRef.current.push(contextMsg);

        try {
            const messages = [
                { role: 'system', content: SYSTEM_INSTRUCTION + '\n\nCONTEXT:\n' + contextRef.current },
                ...conversationHistoryRef.current
            ];

            await sendToGroq(messages);

        } catch (error: any) {
            console.error("Error sending hidden context:", error);
            // Non-blocking error for context
        }
    };

    const startListening = async () => {
        if (isListeningRef.current || isAiSpeakingRef.current) return;

        // Check if we're still connected before starting
        if (statusRef.current !== LiveStatus.CONNECTED) {
            console.log('DEBUG: Not connected, skipping startListening');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream; // Store for cleanup

            // Audio Context for VAD (Voice Activity Detection)
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext; // Store for cleanup

            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            audioChunksRef.current = [];
            isListeningRef.current = true;

            // VAD Variables
            let lastSpeechTime = Date.now();
            let speechStarted = false;
            let silenceTimer: any = null;
            const startTime = Date.now();

            // VAD Sensitivity Settings (volume range: 0-255)
            // Normal speech typically registers 40-100+, quiet speech 20-40
            const SPEECH_THRESHOLD = 20; // Higher threshold filters background noise while catching clear speech
            const SILENCE_AFTER_SPEECH = 1500; // 1.5s silence to detect sentence end (was 2.5s - too long)
            const INITIAL_WAIT_TIMEOUT = 8000; // 8s wait for user to start speaking

            const detectSilence = () => {
                if (!isListeningRef.current) return;

                analyser.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // Update volume for visualizer (normalized 0-1)
                // average is usually 0-100 for speech, max 255. 
                // We divide by 100 to make it responsive, capped at 1 by visualizer.
                setVolume(average / 100);

                if (average > SPEECH_THRESHOLD) {
                    lastSpeechTime = Date.now();
                    if (!speechStarted) {
                        console.log('DEBUG: Speech detected! Vol:', average);
                        speechStarted = true;
                        setIsUserSpeaking(true); // Visual feedback
                    }
                }

                // Logic:
                // 1. If speech started: Wait for 2.5s of silence to finish sentence
                // 2. If NO speech yet: Wait for 10s total before resetting/checking

                const now = Date.now();

                if (speechStarted) {
                    if (now - lastSpeechTime > SILENCE_AFTER_SPEECH) {
                        console.log('DEBUG: End of sentence detected, stopping...');
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    } else {
                        silenceTimer = requestAnimationFrame(detectSilence);
                    }
                } else {
                    // Still waiting for first word
                    if (now - startTime > INITIAL_WAIT_TIMEOUT) {
                        console.log('DEBUG: No speech detected (timeout), restarting listener...');
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                        // Note: handleUserMessage logic in onstop handles empty audio by ignoring or restarting
                    } else {
                        silenceTimer = requestAnimationFrame(detectSilence);
                    }
                }
            };

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstart = () => {
                console.log('DEBUG: Recording started (Waiting for speech...)');
                // Don't set isUserSpeaking(true) yet - wait for actual voice
                setIsUserSpeaking(false);
                setVolume(0); // Optional: show mic activity only when speaking? or keep showing visualizer
                // Actually visualizer usually needs 'volume' state. 
                // Let's rely on visualizer updating volume in a real app, but here we just pass volume prop.
                // For now, let's allow volume updates for visualizer:

                // Start a volume update loop for visualizer independent of VAD if needed,
                // but current VAD loop calculates average anyway.
                // Let's hook volume setting into detectSilence for smoother UI
                detectSilence();
            };

            mediaRecorder.onstop = async () => {
                console.log('DEBUG: Recording stopped');
                setIsUserSpeaking(false);
                setVolume(0);
                isListeningRef.current = false;

                // Cleanup VAD
                cancelAnimationFrame(silenceTimer);
                audioContext.close();
                stream.getTracks().forEach(track => track.stop());

                // Calculate total size
                const totalSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
                console.log('DEBUG: Audio captured size:', totalSize, 'SpeechStarted:', speechStarted);

                // RELAXED CONDITION:
                // Transcribe if speech was detected OR if we captured a significant amount of audio (>10KB)
                // This acts as a failsafe if the VAD threshold was slightly missed but user spoke a lot.
                const hasSignificantAudio = totalSize > 10000;

                if ((speechStarted || hasSignificantAudio) && audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const transcription = await transcribeAudio(audioBlob);

                    if (transcription && transcription.trim().length > 0) {
                        await handleUserMessage(transcription);
                    } else {
                        // Transcription empty? Resume listening
                        if (statusRef.current === LiveStatus.CONNECTED) {
                            setTimeout(() => startListening(), 500);
                        }
                    }
                } else {
                    // No speech detected (timed out waiting)
                    console.log('DEBUG: No sufficient speech captured, resuming listening...');
                    if (statusRef.current === LiveStatus.CONNECTED) {
                        startListening();
                    }
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();

            // Hard safety limit (e.g. 60s max recording)
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 60000);

        } catch (error) {
            console.error('DEBUG: Microphone error:', error);
            setErrorDetails('Microphone access denied. Please allow microphone access.');
            setStatus(LiveStatus.ERROR);
        }
    };

    // Assign startListening to ref so it can be called from speakResponse
    useEffect(() => {
        startListeningRef.current = startListening;
    }, []);

    const connect = useCallback(async (context?: string) => {
        if (status === LiveStatus.CONNECTED) return;

        console.log('DEBUG: Connect called');
        setStatus(LiveStatus.CONNECTING);
        contextRef.current = context || '';
        conversationHistoryRef.current = [];

        try {
            // Test microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            setStatus(LiveStatus.CONNECTED);

            // Generate personalized greeting using Groq
            try {
                console.log('DEBUG: Generating personalized greeting...');
                if (!groqClient) {
                    throw new Error("Groq client not initialized");
                }

                let greetingCompletion;
                try {
                    greetingCompletion = await groqClient.chat.completions.create({
                        messages: [
                            {
                                role: 'system',
                                content: SYSTEM_INSTRUCTION + '\n\nCONTEXT:\n' + contextRef.current
                            },
                            {
                                role: 'user',
                                content: 'Generate a warm, personalized greeting for the user. Address them by name if available in the context. Keep it to 1-2 sentences and invite them to introduce themselves or talk about their experience.'
                            }
                        ],
                        model: 'llama-3.3-70b-versatile',
                        temperature: 0.8,
                        max_tokens: 100,
                    });
                } catch (error: any) {
                    if (error?.status === 429) {
                        console.log('DEBUG: Rate limit reached during greeting, switching to fallback...');
                        greetingCompletion = await groqClient.chat.completions.create({
                            messages: [
                                {
                                    role: 'system',
                                    content: SYSTEM_INSTRUCTION + '\n\nCONTEXT:\n' + contextRef.current
                                },
                                { role: 'user', content: 'Say hello and ask for introduction.' }
                            ],
                            model: 'llama-3.1-8b-instant',
                            temperature: 0.7,
                            max_tokens: 60,
                        });
                    } else {
                        throw error;
                    }
                }

                const greeting = greetingCompletion.choices[0]?.message?.content || "Hello! I'm ready to interview you. Please introduce yourself.";
                console.log('DEBUG: Generated greeting:', greeting);

                conversationHistoryRef.current.push({ role: 'assistant', content: greeting });
                setLogs([{
                    id: 'init',
                    role: 'assistant',
                    text: greeting,
                    timestamp: new Date()
                }]);

                speakResponse(greeting);
            } catch (error) {
                console.error('DEBUG: Failed to generate greeting:', error);
                const fallbackGreeting = "Hello! I'm ready to interview you. Please introduce yourself.";
                conversationHistoryRef.current.push({ role: 'assistant', content: fallbackGreeting });
                setLogs([{
                    id: 'init',
                    role: 'assistant',
                    text: fallbackGreeting,
                    timestamp: new Date()
                }]);
                speakResponse(fallbackGreeting);
            }
        } catch (e) {
            console.error("DEBUG: Connection failed", e);
            setErrorDetails("Failed to access microphone. Please allow microphone access.");
            setStatus(LiveStatus.ERROR);
        }
    }, [status, groqClient]);

    const disconnect = useCallback(() => {
        console.log('DEBUG: Disconnect called');
        setStatus(LiveStatus.DISCONNECTED);
        isListeningRef.current = false;

        // Stop media recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.log('DEBUG: MediaRecorder already stopped');
            }
        }
        mediaRecorderRef.current = null;

        // Stop microphone stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('DEBUG: Stopped track:', track.kind);
            });
            streamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
                audioContextRef.current.close();
            } catch (e) {
                console.log('DEBUG: AudioContext already closed');
            }
            audioContextRef.current = null;
        }

        // Stop audio playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }

        // Stop browser speech synthesis
        window.speechSynthesis.cancel();

        setIsUserSpeaking(false);
        setIsAiSpeaking(false);
        setVolume(0);
    }, []);

    return {
        status,
        connect,
        disconnect,
        isUserSpeaking,
        isAiSpeaking,
        volume,
        logs,
        errorDetails,
        sendHiddenContext
    };
}
