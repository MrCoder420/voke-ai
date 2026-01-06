import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, Users, Settings, LogOut, Activity, 
  Shield, AlertTriangle, Search, Bell, Database, TrendingUp,
  MoreVertical, CheckCircle2, XCircle, Clock, FileText, Plus, Image as ImageIcon, Trash2, Edit, MessageSquare, Flag, Ban, Code2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ADMIN_EMAIL } from "@/config/admin";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [settings, setSettings] = useState({
    siteName: "Voke AI",
    maintenanceMode: false,
    allowRegistrations: true,
    emailNotifications: true,
    systemAnnouncements: "",
    sessionTimeout: [30],
    enforce2FA: false
  });
  const [blogs, setBlogs] = useState<any[]>([]);
  const [newBlog, setNewBlog] = useState({ title: "", image: "", content: "", category: "General" });
  const [newChallenge, setNewChallenge] = useState({ 
    title: "", 
    difficulty: "Easy", 
    description: "", 
    testCases: '[\n  { "input": "[1,2,3]", "output": "[3,2,1]" }\n]', 
    starterCode: "// Write your solution here..." 
  });
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = (user.full_name || "").toLowerCase().includes(searchLower);
    const emailMatch = (user.email || "").toLowerCase().includes(searchLower);
    const dateMatch = new Date(user.created_at).toLocaleDateString().toLowerCase().includes(searchLower);
    return nameMatch || emailMatch || dateMatch;
  });

  useEffect(() => {
    fetchUsers();
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error("Failed to fetch blogs");
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to fetch users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handlePublishBlog = async () => {
    if (!newBlog.title || !newBlog.content) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const blog = {
        title: newBlog.title,
        content: newBlog.content,
        image_url: newBlog.image,
        category: newBlog.category,
        author: user?.email || "Admin",
        status: "Published",
        published_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('blogs')
        .insert([blog]);

      if (error) throw error;
      
      toast.success("Blog published successfully!");
      setNewBlog({ title: "", image: "", content: "", category: "General" });
      fetchBlogs();
    } catch (error: any) {
      console.error('Error publishing blog:', error);
      toast.error(`Failed to publish blog: ${error.message || error.error_description || "Unknown error"}`);
    }
  };

  const handleDeleteBlog = async (id: number) => {
    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Blog deleted");
      fetchBlogs();
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error("Failed to delete blog");
    }
  };

  const handleSaveSettings = () => {
    // In a real app, this would make an API call
    setTimeout(() => {
      toast.success("System settings saved successfully");
    }, 500);
  };

  const handlePublishChallenge = () => {
    if (!newChallenge.title || !newChallenge.description) {
      toast.error("Please fill in the required fields");
      return;
    }
    // Simulate API call
    setTimeout(() => {
      toast.success("Challenge published successfully!");
      setNewChallenge({ 
        title: "", 
        difficulty: "Easy", 
        description: "", 
        testCases: '[\n  { "input": "[1,2,3]", "output": "[3,2,1]" }\n]', 
        starterCode: "// Write your solution here..." 
      });
    }, 500);
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    
    if (session.user.email !== ADMIN_EMAIL) {
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
    setChecking(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { title: "Total Users", value: "12,345", change: "+12%", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", data: [40, 30, 45, 50, 65, 60, 70] },
    { title: "Active Sessions", value: "423", change: "+5%", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", data: [20, 40, 35, 50, 45, 60, 55] },
    { title: "System Health", value: "99.9%", change: "Stable", icon: Database, color: "text-violet-400", bg: "bg-violet-500/10", data: [80, 85, 82, 90, 88, 95, 99] },
    { title: "Pending Reports", value: "15", change: "-2", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", data: [10, 15, 12, 20, 18, 15, 10] },
  ];

  const chartData = [
    { name: 'Mon', users: 4000, sessions: 2400 },
    { name: 'Tue', users: 3000, sessions: 1398 },
    { name: 'Wed', users: 2000, sessions: 9800 },
    { name: 'Thu', users: 2780, sessions: 3908 },
    { name: 'Fri', users: 1890, sessions: 4800 },
    { name: 'Sat', users: 2390, sessions: 3800 },
    { name: 'Sun', users: 3490, sessions: 4300 },
  ];



  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_70%)]" />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex flex-col items-center text-center max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-8">
            You do not have permission to access the Admin Portal. 
            This area is restricted to administrators only.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden font-sans selection:bg-violet-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col relative z-20"
      >
        <div className="p-8 flex items-center gap-3">
          <img 
            src="/images/voke_logo.png" 
            alt="Voke Logo" 
            className="w-10 h-10 object-contain shadow-lg shadow-violet-500/20"
          />
          <div>
            <span className="text-xl font-bold block leading-none">Voke</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Admin Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "users", label: "User Management", icon: Users },
            { id: "community", label: "Community", icon: MessageSquare },
            { id: "challenges", label: "Daily Challenges", icon: Code2 },
            { id: "blogs", label: "Blog Management", icon: FileText },
            { id: "settings", label: "System Settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                activeTab === item.id 
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? "animate-pulse" : ""}`} />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 mix-blend-overlay"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-6 px-2">
            <Avatar className="h-10 w-10 border-2 border-violet-500/30">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">{ADMIN_EMAIL}</p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20" 
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 sticky top-0 z-30 bg-black/50 backdrop-blur-md border-b border-white/5">
          <div>
            <h2 className="text-2xl font-bold capitalize tracking-tight">{activeTab}</h2>
            <p className="text-sm text-gray-500">Welcome back, here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search by name, email or date..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-sm w-64 rounded-full focus:bg-white/10 transition-all"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 relative">
              <Bell className="h-5 w-5 text-gray-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </Button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${stat.bg}`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {stat.change}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-bold">{stat.value}</h3>
                        <p className="text-sm text-gray-400">{stat.title}</p>
                      </div>
                      {/* Mini Sparkline */}
                      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 group-hover:opacity-30 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stat.data.map((val, i) => ({ value: val }))}>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="currentColor" 
                              fill="currentColor" 
                              className={stat.color} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>User Growth & Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} />
                            <YAxis stroke="#6b7280" axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                              itemStyle={{ color: '#e5e7eb' }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                            <Area type="monotone" dataKey="sessions" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>System Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { time: "10:42", msg: "Server started", type: "success" },
                          { time: "10:45", msg: "High memory usage", type: "warning" },
                          { time: "10:48", msg: "User #12345 reset password", type: "info" },
                          { time: "10:55", msg: "DB Connection timeout", type: "error" },
                          { time: "10:55", msg: "DB Connection restored", type: "success" },
                        ].map((log, i) => (
                          <div key={i} className="flex gap-3 items-start text-sm group">
                            <span className="text-gray-500 font-mono text-xs mt-0.5">{log.time}</span>
                            <div className="flex-1">
                              <p className={`font-medium ${
                                log.type === 'success' ? 'text-green-400' :
                                log.type === 'warning' ? 'text-yellow-400' :
                                log.type === 'error' ? 'text-red-400' : 'text-blue-400'
                              }`}>
                                {log.type.toUpperCase()}
                              </p>
                              <p className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors">{log.msg}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Users Table */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Registrations</CardTitle>
                    <Button variant="ghost" size="sm" className="text-violet-400 hover:text-violet-300">View All</Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableHead className="text-gray-400">User</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Role</TableHead>
                          <TableHead className="text-gray-400">Joined</TableHead>
                          <TableHead className="text-right text-gray-400">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingUsers ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-400">Loading...</TableCell>
                          </TableRow>
                        ) : users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-400">No recent registrations</TableCell>
                          </TableRow>
                        ) : (
                          users.slice(0, 5).map((user) => (
                          <TableRow 
                            key={user.id} 
                            className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border border-white/10">
                                  <AvatarFallback className="bg-violet-500/20 text-violet-300">{(user.full_name || "U")[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-200">{user.full_name || "Unknown User"}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-green-500/10 text-green-400 border-0"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400">User</TableCell>
                            <TableCell className="text-gray-400">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      User Management
                      <span className="ml-2 px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-gray-400 font-normal">
                        {users.length}
                      </span>
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={fetchUsers} className="border-white/10 hover:bg-white/5">
                      Refresh List
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-white/5">
                          <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-300">Name</TableHead>
                            <TableHead className="text-gray-300">Email</TableHead>
                            <TableHead className="text-gray-300">Joined Date</TableHead>
                            <TableHead className="text-gray-300">Status</TableHead>
                            <TableHead className="text-right text-gray-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingUsers ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                Loading users...
                              </TableCell>
                            </TableRow>
                          ) : filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                {searchQuery ? "No matching users found" : "No users found"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((user) => (
                              <TableRow 
                                key={user.id} 
                                className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                              >
                                <TableCell className="font-medium text-gray-200">
                                  {user.full_name || "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-400">{user.email || "N/A"}</TableCell>
                                <TableCell className="text-gray-400">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-0">
                                    Active
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-400">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "community" && (
              <motion.div
                key="community"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Total Posts</p>
                        <h3 className="text-2xl font-bold">1,234</h3>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                        <Flag className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Reported Content</p>
                        <h3 className="text-2xl font-bold">15</h3>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Active Users</p>
                        <h3 className="text-2xl font-bold">423</h3>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="w-5 h-5 text-red-400" />
                      Moderation Queue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableHead className="text-gray-300">Author</TableHead>
                          <TableHead className="text-gray-300">Content</TableHead>
                          <TableHead className="text-gray-300">Reason</TableHead>
                          <TableHead className="text-gray-300">Time</TableHead>
                          <TableHead className="text-right text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { id: 1, author: "SpamBot9000", content: "Buy cheap crypto now!!!", reason: "Spam", time: "10m ago" },
                          { id: 2, author: "AngryUser", content: "This platform sucks...", reason: "Harassment", time: "1h ago" },
                        ].map((item) => (
                          <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-medium text-gray-200">{item.author}</TableCell>
                            <TableCell className="text-gray-400 max-w-xs truncate">{item.content}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-0">
                                {item.reason}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400">{item.time}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10">
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-white/10">
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "blogs" && (
              <motion.div
                key="blogs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Create Blog Form */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Plus className="w-5 h-5 text-violet-400" />
                          Create New Blog
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Blog Title</Label>
                          <Input 
                            placeholder="Enter blog title..." 
                            value={newBlog.title}
                            onChange={(e) => setNewBlog({...newBlog, title: e.target.value})}
                            className="bg-black/20 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Cover Image URL</Label>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="https://..." 
                              value={newBlog.image}
                              onChange={(e) => setNewBlog({...newBlog, image: e.target.value})}
                              className="bg-black/20 border-white/10 text-white"
                            />
                            <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Category</Label>
                          <Select 
                            value={newBlog.category} 
                            onValueChange={(value) => setNewBlog({...newBlog, category: value})}
                          >
                            <SelectTrigger className="bg-black/20 border-white/10 text-white">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="AI & Tech">AI & Tech</SelectItem>
                              <SelectItem value="Career Advice">Career Advice</SelectItem>
                              <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                              <SelectItem value="Interview Tips">Interview Tips</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Content</Label>
                          <Textarea 
                            placeholder="Write your blog content here..." 
                            value={newBlog.content}
                            onChange={(e) => setNewBlog({...newBlog, content: e.target.value})}
                            className="bg-black/20 border-white/10 text-white min-h-[300px]"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handlePublishBlog} className="bg-violet-600 hover:bg-violet-700">
                            Publish Blog
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Existing Blogs List */}
                  <div className="space-y-6">
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-400" />
                          Recent Blogs
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {blogs.map((blog) => (
                          <div key={blog.id} className="p-4 rounded-lg bg-black/20 border border-white/5 group hover:border-white/10 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-200 line-clamp-1">{blog.title}</h4>
                              <Badge variant="outline" className={`border-0 ${blog.status === 'Published' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {blog.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                              <div className="flex gap-3">
                                <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                                <span>{blog.views || 0} views</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-blue-400">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-400" onClick={() => handleDeleteBlog(blog.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "challenges" && (
              <motion.div
                key="challenges"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                 <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-orange-400" />
                        Create Daily Challenge
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Challenge Title</Label>
                          <Input 
                            placeholder="e.g. Reverse Linked List" 
                            value={newChallenge.title}
                            onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                            className="bg-black/20 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Difficulty</Label>
                          <Select 
                            value={newChallenge.difficulty} 
                            onValueChange={(value) => setNewChallenge({...newChallenge, difficulty: value})}
                          >
                            <SelectTrigger className="bg-black/20 border-white/10 text-white">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Problem Description (Markdown supported)</Label>
                        <Textarea 
                          placeholder="Describe the problem..." 
                          value={newChallenge.description}
                          onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                          className="bg-black/20 border-white/10 text-white min-h-[150px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="text-gray-300">Test Cases (JSON format)</Label>
                           <Textarea 
                              value={newChallenge.testCases}
                              onChange={(e) => setNewChallenge({...newChallenge, testCases: e.target.value})}
                              className="bg-black/20 border-white/10 text-white font-mono text-xs min-h-[200px]"
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-gray-300">Starter Code (Template)</Label>
                           <Textarea 
                              value={newChallenge.starterCode}
                              onChange={(e) => setNewChallenge({...newChallenge, starterCode: e.target.value})}
                              className="bg-black/20 border-white/10 text-white font-mono text-xs min-h-[200px]"
                           />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-white/10">
                        <Button 
                          onClick={handlePublishChallenge} 
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Code2 className="mr-2 h-4 w-4" />
                          Publish Challenge
                        </Button>
                      </div>
                    </CardContent>
                 </Card>
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative pb-24"
              >
                <div className="mb-8">
                  <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                    System Control Center
                  </h3>
                  <p className="text-gray-400 mt-2">Manage global configurations and security policies.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Platform Settings Card */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="h-full bg-black/40 border-white/10 backdrop-blur-xl hover:border-violet-500/30 transition-all duration-500 group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 group-hover:text-violet-300 transition-colors">
                            <Settings className="w-6 h-6" />
                          </div>
                          Platform
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-8 relative">
                        <div className="space-y-3">
                          <Label htmlFor="siteName" className="text-gray-300 font-medium">Site Name</Label>
                          <Input 
                            id="siteName" 
                            value={settings.siteName} 
                            onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                            className="bg-white/5 border-white/10 text-white focus:border-violet-500/50 focus:ring-violet-500/20 transition-all h-11"
                          />
                        </div>
                        
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="space-y-1">
                              <Label className="text-base text-gray-200 font-medium">Maintenance Mode</Label>
                              <p className="text-xs text-gray-500">Disable user access</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium ${settings.maintenanceMode ? 'text-violet-400' : 'text-gray-600'}`}>
                                {settings.maintenanceMode ? 'ON' : 'OFF'}
                              </span>
                              <Switch 
                                checked={settings.maintenanceMode}
                                onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                                className="data-[state=checked]:bg-violet-600"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="space-y-1">
                              <Label className="text-base text-gray-200 font-medium">Registrations</Label>
                              <p className="text-xs text-gray-500">Allow new sign-ups</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium ${settings.allowRegistrations ? 'text-emerald-400' : 'text-gray-600'}`}>
                                {settings.allowRegistrations ? 'OPEN' : 'CLOSED'}
                              </span>
                              <Switch 
                                checked={settings.allowRegistrations}
                                onCheckedChange={(checked) => setSettings({...settings, allowRegistrations: checked})}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Security Policy Card */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="h-full bg-black/40 border-white/10 backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-500 group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:text-emerald-300 transition-colors">
                            <Shield className="w-6 h-6" />
                          </div>
                          Security
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-8 relative">
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <Label className="text-gray-300 font-medium">Session Timeout</Label>
                              <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
                                {settings.sessionTimeout[0]} min
                              </div>
                            </div>
                            <Slider 
                              value={settings.sessionTimeout} 
                              onValueChange={(val) => setSettings({...settings, sessionTimeout: val})}
                              max={120} 
                              step={5}
                              className="py-2 [&>.relative>.absolute]:bg-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-gray-600 font-mono">
                              <span>5m</span>
                              <span>120m</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                          <div className="space-y-1">
                            <Label className="text-base text-gray-200 font-medium">Enforce 2FA</Label>
                            <p className="text-xs text-gray-500">Mandatory for admins</p>
                          </div>
                          <Switch 
                            checked={settings.enforce2FA}
                            onCheckedChange={(checked) => setSettings({...settings, enforce2FA: checked})}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Notifications Card */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 xl:col-span-1"
                  >
                    <Card className="h-full bg-black/40 border-white/10 backdrop-blur-xl hover:border-orange-500/30 transition-all duration-500 group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:text-orange-300 transition-colors">
                            <Bell className="w-6 h-6" />
                          </div>
                          Notifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-8 relative">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                          <div className="space-y-1">
                            <Label className="text-base text-gray-200 font-medium">Email Alerts</Label>
                            <p className="text-xs text-gray-500">Daily system reports</p>
                          </div>
                          <Switch 
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                            className="data-[state=checked]:bg-orange-500"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-gray-300 font-medium">System Announcement</Label>
                          <Textarea 
                            placeholder="Broadcast message to all users..." 
                            value={settings.systemAnnouncements}
                            onChange={(e) => setSettings({...settings, systemAnnouncements: e.target.value})}
                            className="bg-white/5 border-white/10 text-white min-h-[120px] focus:border-orange-500/50 focus:ring-orange-500/20 transition-all resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Floating Action Bar */}
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="fixed bottom-8 right-8 left-8 md:left-80 z-40"
                >
                  <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 text-sm text-gray-400 px-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      All systems operational
                    </div>
                    <div className="flex gap-4">
                      <Button 
                        variant="ghost" 
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={() => setSettings({
                          siteName: "Voke AI",
                          maintenanceMode: false,
                          allowRegistrations: true,
                          emailNotifications: true,
                          systemAnnouncements: "",
                          sessionTimeout: [30],
                          enforce2FA: false
                        })}
                      >
                        Reset Defaults
                      </Button>
                      <Button 
                        onClick={handleSaveSettings} 
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
