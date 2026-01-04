import React, { useEffect, useRef } from 'react';

interface AudioVisualizerSimpleProps {
    isUserSpeaking: boolean;
    isAiSpeaking: boolean;
    volume: number;
}

export const AudioVisualizerSimple: React.FC<AudioVisualizerSimpleProps> = ({ isUserSpeaking, isAiSpeaking, volume }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size for high DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const baseRadius = 60;

        let phase = 0;

        const render = () => {
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Determine color and activity level
            let activeColor = '#64748b'; // Slate 500 (Idle)
            let radiusMultiplier = 1;
            let pulseSpeed = 0.05;

            if (isUserSpeaking) {
                activeColor = '#3b82f6'; // Blue 500 (User)
                radiusMultiplier = 1 + Math.min(volume, 1) * 0.5;
                pulseSpeed = 0.2;
            } else if (isAiSpeaking) {
                activeColor = '#a855f7'; // Purple 500 (AI)
                radiusMultiplier = 1.2 + Math.sin(phase) * 0.1; // Auto pulse for AI
                pulseSpeed = 0.15;
            }

            phase += pulseSpeed;

            // Draw Main Orb
            const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, baseRadius * radiusMultiplier);
            gradient.addColorStop(0, activeColor);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius * radiusMultiplier, 0, Math.PI * 2);
            ctx.fillStyle = activeColor;
            ctx.globalAlpha = 0.8;
            ctx.fill();

            // Outer Glow
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius * radiusMultiplier * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = activeColor;
            ctx.globalAlpha = 0.2;
            ctx.fill();

            // Ripples (if active)
            if (isUserSpeaking || isAiSpeaking) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, baseRadius * radiusMultiplier * 2 + Math.sin(phase) * 10, 0, Math.PI * 2);
                ctx.strokeStyle = activeColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.1;
                ctx.stroke();
            }

            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [isUserSpeaking, isAiSpeaking, volume]);

    return (
        <div className="w-full h-80 flex items-center justify-center relative">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />

            {/* Status Label Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm font-medium tracking-wide text-slate-400 uppercase">
                {isUserSpeaking ? 'Listening...' : isAiSpeaking ? 'Speaking...' : 'Ready'}
            </div>
        </div>
    );
};
