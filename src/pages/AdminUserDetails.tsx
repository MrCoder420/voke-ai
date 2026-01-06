import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, LayoutDashboard, Settings, FileText, Code2, LogOut, 
  MessageSquare, ArrowLeft, Mail, Calendar, Shield, Activity,
  Trophy, Terminal, Clock, CheckCircle2, Ban, Lock, Edit, Trash2, Search, Bell
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ADMIN_EMAIL } from "@/config/admin";

const AdminUserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // To keep sidebar highlighted correctly
  const [permissions, setPermissions] = useState({
    canPost: true,
    canComment: true,
    isModerator: false,
    isBetaTester: false
  });
  
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({ title: "", message: "" });
  const [sending, setSending] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
    fetchUserDetails();
  }, [userId]);

  const checkAdminRole = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        if (user.email === ADMIN_EMAIL) {
            setIsAdmin(true);
        }
    } catch (error) {
        console.error("Error checking admin role:", error);
    } finally {
        setCurrentUserLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;

      // Fetch interview sessions count (as proxy for "Problems Solved" or activity)
      const { count: interviewsCount, error: countError } = await supabase
        .from('interview_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) throw countError;

      if (profile) {
        setUser({
          id: profile.id,
          full_name: profile.full_name || "Unknown User",
          email: profile.email || "No email", // Note: email might be null in profiles if not synced, usually handled by auth
          role: "User", // Default for now
          status: "Active", // Default for now
          joined_at: profile.created_at,
          last_active: profile.updated_at,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email || userId}`,
          bio: "No bio available", // Not in schema
          location: "Unknown", // Not in schema
          github: profile.github_url || "Not linked",
          website: profile.linkedin_url || "Not linked",
          stats: {
             problems_solved: interviewsCount || 0
          }
        });
      }
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to fetch user details");
      // Fallback or navigate back could be added here
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    if (action === 'Message') {
      setIsMessageDialogOpen(true);
    } else {
      toast.info(`${action} action triggered for user ${userId}`);
    }
  };

  const sendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error("Please fill in both title and message");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notificationForm.title,
          message: notificationForm.message,
        });

      if (error) throw error;
      
      toast.success("Notification sent successfully");
      setIsMessageDialogOpen(false);
      setNotificationForm({ title: "", message: "" });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  // Sidebar Items (reused for visual consistency)
  const sidebarItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/admin" },
    { id: "users", label: "User Management", icon: Users, path: "/admin" },
    { id: "community", label: "Community", icon: MessageSquare, path: "/admin" },
    { id: "challenges", label: "Daily Challenges", icon: Code2, path: "/admin" },
    { id: "blogs", label: "Blog Management", icon: FileText, path: "/admin" },
    { id: "settings", label: "System Settings", icon: Settings, path: "/admin" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden font-sans selection:bg-violet-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 bg-white/5 backdrop-blur-xl border-r border-white/10 flex-col relative z-20 hidden lg:flex"
      >
        <div className="p-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
          <img 
            src="/images/voke_logo.png" 
            alt="Voke Logo" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <span className="text-xl font-bold block leading-none">Voke</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Admin Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                activeTab === item.id 
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
           <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => navigate('/')}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 sticky top-0 z-30 bg-black/50 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">User Details</h2>
              <p className="text-xs text-gray-500">Manage user profile and permissions</p>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* User Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Identify */}
                    <Card className="lg:col-span-1 bg-white/5 border-white/10 backdrop-blur-sm h-full">
                        <CardContent className="p-8 flex flex-col items-center text-center">
                             <div className="relative mb-6">
                                <Avatar className="h-32 w-32 border-4 border-violet-500/20 shadow-2xl">
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback className="text-4xl bg-violet-600">{user.full_name[0]}</AvatarFallback>
                                </Avatar>
                                <Badge className="absolute -bottom-2 -right-2 bg-emerald-500 hover:bg-emerald-600 border-4 border-black px-3 py-1">
                                    {user.status}
                                </Badge>
                             </div>
                             <h2 className="text-2xl font-bold text-white mb-1">{user.full_name}</h2>
                             <p className="text-gray-400 mb-6 flex items-center gap-2">
                                <Mail className="w-4 h-4" /> {user.email}
                             </p>
                             
                             <div className="w-full grid grid-cols-2 gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Role</p>
                                    <p className="font-semibold text-white">{user.role}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Joined</p>
                                    <p className="font-semibold text-white">{new Date(user.joined_at).toLocaleDateString()}</p>
                                </div>
                             </div>

                             <div className="w-full space-y-3">
                                <Button 
                                    className="w-full bg-violet-600 hover:bg-violet-700" 
                                    onClick={() => handleAction('Message')}
                                    disabled={!isAdmin && !currentUserLoading}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" /> 
                                    {isAdmin ? "Send Notification" : "Admin Only"}
                                </Button>
                                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 hover:text-white" onClick={() => handleAction('Reset Password')}>
                                    <Lock className="w-4 h-4 mr-2" /> Reset Password
                                </Button>
                                <Button variant="destructive" className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20" onClick={() => handleAction('Ban')}>
                                    <Ban className="w-4 h-4 mr-2" /> Ban User
                                </Button>
                             </div>
                        </CardContent>
                    </Card>

                    {/* Right Column: Stats & Activity */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: "XP Earned", value: "0", icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
                                { label: "Interviews", value: user.stats?.problems_solved || "0", icon: Terminal, color: "text-blue-400", bg: "bg-blue-500/10" },
                                { label: "Streak", value: "0 Days", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                { label: "Time Spent", value: "0h", icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
                            ].map((stat, i) => (
                                <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                        <div className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                                        <p className="text-xs text-gray-400 font-medium uppercase">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Recent Activity */}
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-violet-400" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                                    {[
                                        { action: "Solved 'Two Sum'", details: "Passed all test cases (12ms)", time: "2 hours ago", type: "code" },
                                        { action: "Posted in Community", details: "Asked about Dynamic Programming", time: "5 hours ago", type: "post" },
                                        { action: "Logged In", details: "From San Francisco, CA", time: "1 day ago", type: "login" },
                                        { action: "Updated Profile", details: "Changed avatar image", time: "3 days ago", type: "edit" }
                                    ].map((activity, i) => (
                                        <div key={i} className="flex gap-4 relative">
                                            <div className="w-10 h-10 rounded-full bg-[#0f1117] border border-white/10 flex items-center justify-center shrink-0 z-10">
                                                {activity.type === 'code' ? <Code2 className="w-4 h-4 text-blue-400" /> : 
                                                 activity.type === 'post' ? <MessageSquare className="w-4 h-4 text-emerald-400" /> :
                                                 activity.type === 'login' ? <CheckCircle2 className="w-4 h-4 text-violet-400" /> :
                                                 <Edit className="w-4 h-4 text-amber-400" />}
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-semibold text-gray-200">{activity.action}</h4>
                                                    <span className="text-xs text-gray-500 font-mono">{activity.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">{activity.details}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Permissions Control */}
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-red-400" />
                                    Permissions & Roles
                                </CardTitle>
                                <CardDescription>Manage user access and feature availability</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base text-gray-200">Posting Privileges</Label>
                                        <p className="text-xs text-gray-500">Allow user to create community posts</p>
                                    </div>
                                    <Switch 
                                        checked={permissions.canPost}
                                        onCheckedChange={(c) => setPermissions({...permissions, canPost: c})}
                                    />
                                </div>
                                <Separator className="bg-white/5" />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base text-gray-200">Comment Access</Label>
                                        <p className="text-xs text-gray-500">Allow user to comment on discussions</p>
                                    </div>
                                    <Switch 
                                        checked={permissions.canComment}
                                        onCheckedChange={(c) => setPermissions({...permissions, canComment: c})}
                                    />
                                </div>
                                <Separator className="bg-white/5" />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base text-gray-200">Moderator Status</Label>
                                        <p className="text-xs text-gray-500">Grant admin-lite privileges</p>
                                    </div>
                                    <Switch 
                                        checked={permissions.isModerator}
                                        onCheckedChange={(c) => setPermissions({...permissions, isModerator: c})}
                                        className="data-[state=checked]:bg-violet-600"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Send Message Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent className="bg-[#0f1117] border-white/10 text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription className="text-gray-400">
                Send a direct notification to {user?.full_name}. This will appear in their dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Notification Title"
                  className="bg-white/5 border-white/10"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  className="bg-white/5 border-white/10"
                  rows={4}
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)} className="border-white/10 hover:bg-white/5 text-gray-300">
                Cancel
              </Button>
              <Button onClick={sendNotification} disabled={sending} className="bg-violet-600 hover:bg-violet-700 text-white">
                {sending ? "Sending..." : "Send Notification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminUserDetails;
