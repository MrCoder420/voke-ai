import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { Mic, Bell, Check } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

import { UpgradeButton } from "@/components/UpgradeButton";

export const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);

    const isCommunityPage = location.pathname === '/community';
    const brandName = isCommunityPage ? "Voke Pulse" : "Voke";
    const logoSrc = isCommunityPage ? "/images/voke_pulse_logo.png" : "/images/voke_logo.png";

    useEffect(() => {
        checkUser();
        
        // Subscribe to realtime notifications
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    if (payload.new.user_id === userId) {
                        fetchNotifications();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]); // Re-subscribe if userId changes

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            fetchNotifications(session.user.id);
            fetchProfile(session.user.id);
        }
    };

    const fetchProfile = async (uid: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();
        if (data) setProfile(data);
    };

    const fetchNotifications = async (uid = userId) => {
        if (!uid) return;
        const { data } = await supabase
            .from('notifications' as any)
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.read).length);
        }
    };

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications' as any)
            .update({ read: true })
            .eq('id', id);
        
        // Update local state
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleLogoClick = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            navigate("/dashboard");
        } else {
            navigate("/");
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl transition-colors duration-300">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Brand */}
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={handleLogoClick}
                    >
                        <img
                            src={logoSrc}
                            alt={`${brandName} Logo`}
                            className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                        <span className="text-xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:via-purple-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                            {brandName}
                        </span>
                    </div>

                    {/* Center Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/learning-paths")}
                            className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        >
                            Learning Paths
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/video-interview")}
                            className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        >
                            Video Practice
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => navigate("/voice-assistant")}
                            className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        >
                            AI Voice Agent
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/blogs")}
                            className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        >
                            Blogs
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/community")}
                            className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        >
                            Community
                        </Button>
                    </div>

                    {/* Right Side - Theme Toggle & CTA */}
                    <div className="flex items-center gap-3">

                        <UpgradeButton />
                        {userId && (
                            <>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="relative">
                                            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                            {unreadCount > 0 && (
                                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0 mr-4 bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-white/10 shadow-xl" align="end">
                                        <div className="p-4 border-b border-gray-200 dark:border-white/10">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">Notifications</h4>
                                        </div>
                                        <ScrollArea className="h-[300px]">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                    No notifications yet
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                                    {notifications.map((notification) => (
                                                        <div 
                                                            key={notification.id} 
                                                            className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                                                            onClick={() => markAsRead(notification.id)}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                                                <div className="space-y-1">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200 leading-none">
                                                                        {notification.title}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                                        {new Date(notification.created_at).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>

                                {/* Profile Strength - Circular Ring */}
                                {(() => {
                                    // Calculate Score
                                    const score = (() => {
                                        if (!profile) return 0;
                                        let s = 0;
                                        const fields = ['full_name', 'linkedin_url', 'github_url', 'resume_url'];
                                        fields.forEach(k => { if (profile[k]) s += 25; });
                                        return s;
                                    })();
                                    
                                    // Ring Color
                                    const strokeColor = score === 100 ? "#10b981" : score >= 50 ? "#eab308" : "#ef4444";
                                    const radius = 18;
                                    const circumference = 2 * Math.PI * radius;
                                    const offset = circumference - (score / 100) * circumference;

                                    return (
                                        <div className="relative flex items-center justify-center w-10 h-10 cursor-pointer group" onClick={() => navigate('/profile')}>
                                            {/* Tooltip */}
                                            <div className="absolute top-12 right-0 w-max px-3 py-1.5 bg-popover border border-border text-xs font-medium rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                Profile Strength: <span style={{ color: strokeColor }}>{score}%</span>
                                            </div>

                                            {/* Background Circle */}
                                            <svg className="absolute w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="20"
                                                    cy="20"
                                                    r={radius}
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    fill="transparent"
                                                    className="text-muted/30"
                                                />
                                                {/* Progress Circle */}
                                                <circle
                                                    cx="20"
                                                    cy="20"
                                                    r={radius}
                                                    stroke={strokeColor}
                                                    strokeWidth="2.5"
                                                    fill="transparent"
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={offset}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>

                                            {/* Avatar/Initials */}
                                            <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-300">
                                                {profile?.full_name?.charAt(0) || "U"}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </>
                        )}
                        <ThemeToggle />
                        {!userId && (
                            <Button
                                onClick={() => navigate("/auth")}
                                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 dark:from-violet-500 dark:to-purple-500 dark:hover:from-violet-600 dark:hover:to-purple-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-500/20 transition-all duration-300 hover:scale-105"
                            >
                                Get Started
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};
