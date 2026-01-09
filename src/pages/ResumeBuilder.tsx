import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  User, Briefcase, GraduationCap, Code, FileText,
  Plus, Trash2, Download, Printer, Wand2, ChevronLeft,
  LayoutTemplate, Palette, Globe, Mail, Phone, MapPin, Linkedin, Github, Sparkles, Link as LinkIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import ResumeAnalysisDisplay from "@/components/ResumeAnalysisDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// --- Types ---
interface Experience {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
  coursework: string;
  location: string;
}

interface Leadership {
  id: string;
  type: 'Leadership' | 'Hackathon' | 'Certificate';
  role: string;
  organization: string;
  duration: string;
  description: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  link: string;
}

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  leetcode: string;
  codeforces: string;
  summary: string;
  skills: string;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  leadership: Leadership[];
  photo?: string;
}

const ResumeBuilder = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personal");
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);

  // Initial State
  const [data, setData] = useState<ResumeData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    website: "",
    leetcode: "",
    codeforces: "",
    summary: "",
    skills: "", // Kept in state for now, but removed from interface
    experience: [],
    education: [],
    projects: [],
    leadership: []
  });

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Calculation for completion progress
  const calculateProgress = () => {
    let score = 0;
    if (data.fullName) score += 10;
    if (data.email) score += 10;
    if (data.summary) score += 15;
    if (data.skills) score += 15;
    if (data.experience.length > 0) score += 20;
    if (data.education.length > 0) score += 15;
    if (data.projects.length > 0) score += 10;
    if (data.leadership.length > 0) score += 5;
    return Math.min(100, score);
  };

  const progress = calculateProgress();

  // Handlers
  const handleChange = (field: keyof ResumeData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiEnhance = () => {
    if (!data.summary) {
      toast.error("Please add a basic summary first for AI to enhance.");
      return;
    }
    setIsAiEnhancing(true);
    setTimeout(() => {
      setData(prev => ({
        ...prev,
        summary: "Results-driven professional with a proven track record of delivering high-quality solutions. Expertise in full-stack development, cloud architecture, and agile methodologies. Passionate about leveraging technology to drive business growth and optimize user experiences."
      }));
      setIsAiEnhancing(false);
      toast.success("Summary enhanced by AI!");
    }, 1500);
  };

  // Array Handlers (Experience)
  const addExperience = () => {
    setData(prev => ({
      ...prev,
      experience: [...prev.experience, { id: Date.now().toString(), role: "", company: "", duration: "", description: "" }]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeExperience = (id: string) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.filter(item => item.id !== id)
    }));
  };

  // Array Handlers (Education)
  const addEducation = () => {
    setData(prev => ({
      ...prev,
      education: [...prev.education, { id: Date.now().toString(), degree: "", school: "", year: "", coursework: "", location: "" }]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeEducation = (id: string) => {
    setData(prev => ({
      ...prev,
      education: prev.education.filter(item => item.id !== id)
    }));
  };

  // Array Handlers (Projects)
  const addProject = () => {
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, { id: Date.now().toString(), name: "", description: "", link: "" }]
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeProject = (id: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter(item => item.id !== id)
    }));
  };

  // Array Handlers (Leadership)
  const addLeadership = () => {
    setData(prev => ({
      ...prev,
      leadership: [...prev.leadership, { id: Date.now().toString(), type: 'Leadership', role: "", organization: "", duration: "", description: "" }]
    }));
  };

  const updateLeadership = (id: string, field: keyof Leadership, value: string) => {
    setData(prev => ({
      ...prev,
      leadership: prev.leadership.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeLeadership = (id: string) => {
    setData(prev => ({
      ...prev,
      leadership: prev.leadership.filter(item => item.id !== id)
    }));
  };

  const handleAnalyzeResume = async () => {
    setAnalyzing(true);
    setAnalysisOpen(true);

    try {
      // Construct resume text for analysis
      let resumeText = `Name: ${data.fullName}\nEmail: ${data.email}\nSummary: ${data.summary}\n\n`;

      if (data.skills) resumeText += `Skills: ${data.skills}\n\n`;

      if (data.experience.length > 0) {
        resumeText += "Experience:\n";
        data.experience.forEach(exp => {
          resumeText += `${exp.role} at ${exp.company} (${exp.duration})\n${exp.description}\n\n`;
        });
      }

      if (data.education.length > 0) {
        resumeText += "Education:\n";
        data.education.forEach(edu => {
          resumeText += `${edu.degree} from ${edu.school} (${edu.year})${edu.location ? `, ${edu.location}` : ''}\nCoursework: ${edu.coursework}\n\n`;
        });
      }

      if (data.projects.length > 0) {
        resumeText += "Projects:\n";
        data.projects.forEach(proj => {
          resumeText += `${proj.name}: ${proj.description}\n${proj.link}\n\n`;
        });
      }

      if (data.leadership.length > 0) {
        resumeText += "Leadership:\n";
        data.leadership.forEach(lead => {
          resumeText += `${lead.role} at ${lead.organization} (${lead.duration})\n${lead.description}\n\n`;
        });
      }

      if (resumeText.length < 50) {
        toast.error("Resume content is too short for analysis. Please add more details.");
        setAnalyzing(false);
        setAnalysisOpen(false); // Close dialog if it was opened
        return;
      }

      const { data: analysisData, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resumeText: resumeText,
          // resumeUrl: "generated-from-builder" // Removing to prevent potential backend confusion
        }
      });

      if (error) throw error;
      setAnalysisResult(analysisData);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis failed:", error);
      toast.error(error.message || "Failed to analyze resume. Please try again.");
      setAnalysisOpen(false); // Close dialog on error
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground flex flex-col font-sans selection:bg-amber-500/30">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; color: black; }
            .print-container {
              padding: 0;
              margin: 0;
              width: 100%;
              max-width: none;
              box-shadow: none;
              border: none;
              transform: none !important;
            }
            @page { margin: 0.5cm; }
          }

          /* Custom scrollbar for editor */
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}
      </style>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden no-print">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-20 no-print sticky top-0 supports-[backdrop-filter]:bg-black/40">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 p-2 rounded-xl border border-white/5">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Resume Builder</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide">AI-POWERED • ATS FRIENDLY</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 w-1/3">
          <div className="flex-1 group">
            <div className="flex justify-between text-xs mb-1.5 font-medium text-muted-foreground group-hover:text-white transition-colors">
              <span>Completion Strength</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAnalyzeResume}
            disabled={analyzing}
            className="bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'ATS Score'}
          </Button>
          <Button variant="outline" onClick={handlePrint} className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all shadow-sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handlePrint} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden z-10 relative">

        {/* LEFT: Editor Panel */}
        <div className="w-[45%] border-r border-white/5 bg-black/20 backdrop-blur-md flex flex-col no-print">
          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="p-6 max-w-2xl mx-auto space-y-8 pb-20">

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-6 mb-8 bg-white/5 text-muted-foreground border border-white/10 p-1 h-auto rounded-xl">
                  <TabsTrigger value="personal" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><User className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="experience" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><Briefcase className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="education" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><GraduationCap className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="projects" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><LayoutTemplate className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="leadership" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><Sparkles className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="skills" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><Code className="w-4 h-4" /></TabsTrigger>
                </TabsList>

                <div className="relative">
                  {/* Personal Info Tab */}
                  <TabsContent value="personal" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Card className="bg-black/40 border-white/10 text-white backdrop-blur-sm shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5 text-amber-500" />
                          Personal Information
                        </CardTitle>
                        <CardDescription className="text-zinc-400">Your contact details and professional branding.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-zinc-400 font-normal">Full Name</Label>
                            <Input placeholder="e.g. John Doe" value={data.fullName} onChange={(e) => handleChange('fullName', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 font-normal">Profile Photo (Optional)</Label>
                            <div className="flex items-center gap-3">
                              {data.photo && <img src={data.photo} alt="Preview" className="w-9 h-9 rounded-full object-cover border border-white/10" />}
                              <Input type="file" accept="image/*" onChange={handlePhotoUpload} className="bg-white/5 border-white/10 text-white file:text-white file:bg-white/10 file:border-0 file:rounded-md file:px-2 file:mr-3 text-xs" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-zinc-400 font-normal">Email</Label>
                            <Input placeholder="e.g. john@example.com" value={data.email} onChange={(e) => handleChange('email', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 font-normal">Phone</Label>
                            <Input placeholder="e.g. +1 234 567 890" value={data.phone} onChange={(e) => handleChange('phone', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-400 font-normal">Location</Label>
                          <Input placeholder="e.g. New York, NY" value={data.location} onChange={(e) => handleChange('location', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-zinc-400 font-normal">Social Links / Coding Profiles</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative">
                              <Linkedin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                              <Input placeholder="LinkedIn URL" value={data.linkedin} onChange={(e) => handleChange('linkedin', e.target.value)} className="pl-9 bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                            </div>
                            <div className="relative">
                              <Github className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                              <Input placeholder="GitHub URL" value={data.github} onChange={(e) => handleChange('github', e.target.value)} className="pl-9 bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                            </div>
                            <div className="relative">
                              <Globe className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                              <Input placeholder="Portfolio URL" value={data.website} onChange={(e) => handleChange('website', e.target.value)} className="pl-9 bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                            </div>
                            <div className="relative">
                              <Code className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                              <Input placeholder="LeetCode URL" value={data.leetcode} onChange={(e) => handleChange('leetcode', e.target.value)} className="pl-9 bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                            </div>
                            <div className="relative">
                              <Code className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                              <Input placeholder="CodeForces URL" value={data.codeforces} onChange={(e) => handleChange('codeforces', e.target.value)} className="pl-9 bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-zinc-400 font-normal">Professional Summary</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-3 text-xs font-medium transition-all ${isAiEnhancing ? 'bg-amber-500/20 text-amber-500' : 'text-amber-500 hover:bg-amber-500/10'}`}
                              onClick={handleAiEnhance}
                              disabled={isAiEnhancing}
                            >
                              {isAiEnhancing ? <Sparkles className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                              AI Refine
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Briefly describe your professional background and key achievements..."
                            className="h-32 resize-none bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20 leading-relaxed"
                            value={data.summary}
                            onChange={(e) => handleChange('summary', e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Experience Tab */}
                  <TabsContent value="experience" className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div>
                        <h3 className="font-semibold text-lg text-white">Work History</h3>
                        <p className="text-sm text-zinc-400">Add your relevant work experience.</p>
                      </div>
                      <Button size="sm" onClick={addExperience} className="bg-white/10 hover:bg-white/20 text-white border border-white/10"><Plus className="w-4 h-4 mr-2" /> Add Position</Button>
                    </div>

                    <div className="space-y-4">
                      {data.experience.map((exp, index) => (
                        <Card key={exp.id} className="relative group bg-black/40 border-white/10 text-white overflow-hidden transition-colors hover:border-white/20">
                          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gradient-to-l from-black/80 to-transparent">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => removeExperience(exp.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Job Title</Label>
                                <Input placeholder="e.g. Senior Developer" value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Company</Label>
                                <Input placeholder="e.g. Google" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Duration</Label>
                              <Input placeholder="e.g. Jan 2020 - Present" value={exp.duration} onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Responsibilities</Label>
                              <Textarea
                                placeholder="Describe your key achievements and responsibilities..."
                                className="h-24 resize-none bg-white/5 border-white/10 focus:border-amber-500/50 text-white/90 text-sm"
                                value={exp.description}
                                onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {data.experience.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500 flex flex-col items-center justify-center gap-2">
                        <Briefcase className="w-8 h-8 opacity-20" />
                        <span>No experience added yet. Click the button above to start.</span>
                      </div>
                    )}
                  </TabsContent>

                  {/* Education Tab */}
                  <TabsContent value="education" className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div>
                        <h3 className="font-semibold text-lg text-white">Education</h3>
                        <p className="text-sm text-zinc-400">Your academic background.</p>
                      </div>
                      <Button size="sm" onClick={addEducation} className="bg-white/10 hover:bg-white/20 text-white border border-white/10"><Plus className="w-4 h-4 mr-2" /> Add School</Button>
                    </div>
                    {data.education.map((edu) => (
                      <Card key={edu.id} className="relative group bg-black/40 border-white/10 text-white hover:border-white/20 transition-colors">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => removeEducation(edu.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <CardContent className="pt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Degree / Major</Label>
                              <Input placeholder="e.g. BS Computer Science" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">School / University</Label>
                              <Input placeholder="e.g. MIT" value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Year / Duration</Label>
                              <Input placeholder="e.g. 2016 - 2020" value={edu.year} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Location</Label>
                              <Input placeholder="e.g. Cambridge, MA" value={edu.location} onChange={(e) => updateEducation(edu.id, 'location', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Relevant Coursework</Label>
                            <Textarea
                              placeholder="e.g. Data Structures, Algorithms, OS, Networks..."
                              className="h-16 resize-none bg-white/5 border-white/10 focus:border-amber-500/50 text-white/90 text-sm"
                              value={edu.coursework || ""}
                              onChange={(e) => updateEducation(edu.id, 'coursework', e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {data.education.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500 flex flex-col items-center justify-center gap-2">
                        <GraduationCap className="w-8 h-8 opacity-20" />
                        <span>No education added yet.</span>
                      </div>
                    )}
                  </TabsContent>

                  {/* Projects Tab */}
                  <TabsContent value="projects" className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div>
                        <h3 className="font-semibold text-lg text-white">Projects</h3>
                        <p className="text-sm text-zinc-400">Showcase your best work.</p>
                      </div>
                      <Button size="sm" onClick={addProject} className="bg-white/10 hover:bg-white/20 text-white border border-white/10"><Plus className="w-4 h-4 mr-2" /> Add Project</Button>
                    </div>
                    {data.projects.map((proj) => (
                      <Card key={proj.id} className="relative group bg-black/40 border-white/10 text-white hover:border-white/20 transition-colors">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => removeProject(proj.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardContent className="pt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Project Name</Label>
                              <Input placeholder="e.g. E-commerce Platform" value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Link</Label>
                              <Input placeholder="e.g. github.com/..." value={proj.link} onChange={(e) => updateProject(proj.id, 'link', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Description</Label>
                            <Textarea
                              placeholder="Tech stack used, your role, and the outcome..."
                              className="h-24 resize-none bg-white/5 border-white/10 focus:border-amber-500/50 text-white/90 text-sm"
                              value={proj.description}
                              onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {data.projects.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500 flex flex-col items-center justify-center gap-2">
                        <LayoutTemplate className="w-8 h-8 opacity-20" />
                        <span>No projects added yet.</span>
                      </div>
                    )}
                  </TabsContent>

                  {/* Leadership Tab */}
                  <TabsContent value="leadership" className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div>
                        <h3 className="font-semibold text-lg text-white">Leadership / Extracurricular</h3>
                        <p className="text-sm text-zinc-400">Add leadership roles or volunteering.</p>
                      </div>
                      <Button size="sm" onClick={addLeadership} className="bg-white/10 hover:bg-white/20 text-white border border-white/10"><Plus className="w-4 h-4 mr-2" /> Add Activity</Button>
                    </div>
                    {data.leadership.map((item) => (
                      <Card key={item.id} className="relative group bg-black/40 border-white/10 text-white hover:border-white/20 transition-colors">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => removeLeadership(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardContent className="pt-6 space-y-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Activity Type</Label>
                              <Select value={item.type} onValueChange={(value: any) => updateLeadership(item.id, 'type', value)}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                  <SelectItem value="Leadership">Leadership / Volunteering</SelectItem>
                                  <SelectItem value="Hackathon">Hackathon</SelectItem>
                                  <SelectItem value="Certificate">Certificate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                  {item.type === 'Hackathon' ? 'Project / Achievement' :
                                    item.type === 'Certificate' ? 'Certificate Name' : 'Role'}
                                </Label>
                                <Input
                                  placeholder={
                                    item.type === 'Hackathon' ? "e.g. Won 1st Place" :
                                      item.type === 'Certificate' ? "e.g. AWS Certified Solutions Architect" : "e.g. Club President"
                                  }
                                  value={item.role}
                                  onChange={(e) => updateLeadership(item.id, 'role', e.target.value)}
                                  className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                  {item.type === 'Hackathon' ? 'Hackathon Name' :
                                    item.type === 'Certificate' ? 'Issuing Organization' : 'Organization'}
                                </Label>
                                <Input
                                  placeholder={
                                    item.type === 'Hackathon' ? "e.g. HackMIT 2024" :
                                      item.type === 'Certificate' ? "e.g. Amazon Web Services" : "e.g. Coding Club"
                                  }
                                  value={item.organization}
                                  onChange={(e) => updateLeadership(item.id, 'organization', e.target.value)}
                                  className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Duration</Label>
                            <Input placeholder="e.g. 2021 - 2022" value={item.duration} onChange={(e) => updateLeadership(item.id, 'duration', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Description</Label>
                            <Textarea
                              placeholder="Describe your responsibilities..."
                              className="h-24 resize-none bg-white/5 border-white/10 focus:border-amber-500/50 text-white/90 text-sm"
                              value={item.description}
                              onChange={(e) => updateLeadership(item.id, 'description', e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {data.leadership.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500 flex flex-col items-center justify-center gap-2">
                        <Sparkles className="w-8 h-8 opacity-20" />
                        <span>No leadership added yet.</span>
                      </div>
                    )}
                  </TabsContent>


                  {/* Skills Tab */}
                  <TabsContent value="skills" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Card className="bg-black/40 border-white/10 text-white backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Code className="w-5 h-5 text-amber-500" />
                          Skills & Expertise
                        </CardTitle>
                        <CardDescription className="text-zinc-400">List your technical skills separated by commas.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-zinc-400 font-normal">Technical Skills</Label>
                          <Textarea
                            placeholder="e.g. React, TypeScript, Node.js, Python, AWS, Docker..."
                            className="h-40 bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20 leading-relaxed text-base"
                            value={data.skills}
                            onChange={(e) => handleChange('skills', e.target.value)}
                          />
                        </div>
                        <div className="pt-2">
                          <Label className="mb-3 block text-zinc-400 text-xs uppercase tracking-wider">Live Preview</Label>
                          <div className="flex flex-wrap gap-2 p-4 bg-white/5 rounded-xl border border-white/5 min-h-[4rem]">
                            {data.skills.split(',').filter(s => s.trim()).map((skill, i) => (
                              <Badge key={i} variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 px-3 py-1 text-sm font-normal">
                                {skill.trim()}
                              </Badge>
                            ))}
                            {data.skills.split(',').filter(s => s.trim()).length === 0 && (
                              <span className="text-zinc-600 text-sm italic">Type above to see your skills here...</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: Live Preview (Canvas) */}
        <div className="flex-[1.2] bg-[#1a1a1a] overflow-y-auto flex items-start justify-center relative p-8 md:p-12">
          {/* Background pattern for preview area */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="print-container bg-white shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[210mm] min-h-[297mm] p-[8mm] text-left text-[10.5pt] text-gray-900 transition-all duration-300 ease-in-out origin-top transform scale-[0.65] md:scale-[0.75] lg:scale-[0.85] xl:scale-95 ml-auto mr-auto relative group z-10 font-sans leading-snug">

            {/* Header */}
            <div className="text-center mb-3">
              {data.photo && (
                <div className="flex justify-center mb-4">
                  <img src={data.photo} alt={data.fullName} className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm" />
                </div>
              )}
              <h1 className="text-3xl font-normal uppercase tracking-wide mb-2">{data.fullName || "FIRST LAST"}</h1>
              <div className="flex flex-col items-center text-[10pt] mt-1 space-y-1">
                {(data.location || data.phone || data.email) && (
                  <div className="flex items-center gap-3">
                    {data.location && <span>{data.location}</span>}
                    {data.phone && (
                      <>
                        {data.location && <span>•</span>}
                        <span>{data.phone}</span>
                      </>
                    )}
                    {data.email && (
                      <>
                        {(data.location || data.phone) && <span>•</span>}
                        <a href={`mailto:${data.email}`} className="text-gray-900">{data.email}</a>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 text-gray-900">
                  {data.linkedin && (
                    <a href={data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`} target="_blank" rel="noreferrer" className="hover:text-blue-700 transition-colors">
                      <Linkedin className="w-4 h-4 text-[#0077b5]" />
                    </a>
                  )}
                  {data.github && (
                    <a href={data.github.startsWith('http') ? data.github : `https://${data.github}`} target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
                      <Github className="w-4 h-4 text-black" />
                    </a>
                  )}
                  {data.website && (
                    <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`} target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition-colors">
                      <Globe className="w-4 h-4 text-emerald-600" />
                    </a>
                  )}
                  {data.leetcode && (
                    <a href={data.leetcode.startsWith('http') ? data.leetcode : `https://${data.leetcode}`} target="_blank" rel="noreferrer" className="hover:text-yellow-600 transition-colors">
                      <Code className="w-4 h-4 text-[#FFA116]" />
                    </a>
                  )}
                  {data.codeforces && (
                    <a href={data.codeforces.startsWith('http') ? data.codeforces : `https://${data.codeforces}`} target="_blank" rel="noreferrer" className="hover:text-red-600 transition-colors">
                      <span className="font-bold font-mono text-xs text-[#1f8dd6]">C<span className="text-[#b40e0e]">F</span></span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            {data.summary && (
              <div className="mb-4 text-justify">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">Profile</h2>
                <p className="leading-normal">{data.summary}</p>
              </div>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">Education</h2>
                <div className="space-y-2">
                  {data.education.map(edu => (
                    <div key={edu.id}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{edu.school}</h3>
                        <span className="text-[10pt] italic">{edu.year}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <div className="italic">{edu.degree}</div>
                        {edu.location && <span className="text-[10pt]">{edu.location}</span>}
                      </div>
                      {edu.coursework && (
                        <div className="text-[10pt] mt-1">
                          <span className="font-bold">Relevant Coursework:</span> {edu.coursework}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {data.experience.length > 0 && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">Experience</h2>
                <div className="space-y-3">
                  {data.experience.map(exp => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{exp.company}</h3>
                        <span className="text-[10pt] italic">{exp.duration}</span>
                      </div>
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="italic">{exp.role}</div>
                      </div>
                      <ul className="list-disc list-outside ml-4 space-y-0.5 text-[10.5pt]">
                        {exp.description.split('\n').map((line, i) => line.trim() && (
                          <li key={i} className="pl-1">{line.trim().replace(/^[-•]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {data.projects.length > 0 && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">Projects</h2>
                <div className="space-y-2">
                  {data.projects.map(proj => (
                    <div key={proj.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{proj.name}</h3>
                          {proj.link && (
                            <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                              <Globe className="w-3.5 h-3.5 text-blue-600" />
                            </a>
                          )}
                        </div>
                      </div>
                      <ul className="list-disc list-outside ml-4 space-y-0.5 text-[10.5pt]">
                        {proj.description.split('\n').map((line, i) => line.trim() && (
                          <li key={i} className="pl-1">{line.trim().replace(/^[-•]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hackathons / Honors */}
            {data.leadership.filter(item => item.type === 'Hackathon').length > 0 && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">
                  Honors & Hackathons
                </h2>
                <div className="space-y-2">
                  {data.leadership.filter(item => item.type === 'Hackathon').map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{item.organization}</h3>
                        <span className="text-[10pt] italic">{item.duration}</span>
                      </div>
                      <div className="italic mb-1">{item.role}</div>
                      <ul className="list-disc list-outside ml-4 space-y-0.5 text-[10.5pt]">
                        {item.description.split('\n').map((line, i) => line.trim() && (
                          <li key={i} className="pl-1">{line.trim().replace(/^[-•]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {data.leadership.filter(item => item.type === 'Certificate').length > 0 && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">
                  Certifications
                </h2>
                <div className="space-y-2">
                  {data.leadership.filter(item => item.type === 'Certificate').map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{item.organization}</h3>
                        <span className="text-[10pt] italic">{item.duration}</span>
                      </div>
                      <div className="italic mb-1">{item.role}</div>
                      <ul className="list-disc list-outside ml-4 space-y-0.5 text-[10.5pt]">
                        {item.description.split('\n').map((line, i) => line.trim() && (
                          <li key={i} className="pl-1">{line.trim().replace(/^[-•]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leadership */}
            {data.leadership.filter(item => !item.type || item.type === 'Leadership').length > 0 && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">
                  Leadership / Extracurricular
                </h2>
                <div className="space-y-2">
                  {data.leadership.filter(item => !item.type || item.type === 'Leadership').map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{item.organization}</h3>
                        <span className="text-[10pt] italic">{item.duration}</span>
                      </div>
                      <div className="italic mb-1">{item.role}</div>
                      <ul className="list-disc list-outside ml-4 space-y-0.5 text-[10.5pt]">
                        {item.description.split('\n').map((line, i) => line.trim() && (
                          <li key={i} className="pl-1">{line.trim().replace(/^[-•]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {data.skills && (
              <div className="mb-4">
                <h2 className="text-[11pt] font-bold uppercase border-b border-gray-400 mb-1">Technical Skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {data.skills.split(',').map((skill, index) => (
                    <span key={index} className="bg-gray-200 px-1.5 py-0.5 rounded text-[9pt] text-gray-800 font-medium">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main >

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Resume Analysis</DialogTitle>
          </DialogHeader>
          {analysisResult ? (
            <ResumeAnalysisDisplay analysis={analysisResult} />
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
              <Sparkles className="w-12 h-12 mb-4 animate-pulse opacity-50" />
              <p>Analyzing your resume...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default ResumeBuilder;
