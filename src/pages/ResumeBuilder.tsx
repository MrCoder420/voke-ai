import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  User, Briefcase, GraduationCap, Code, FileText, 
  Plus, Trash2, Download, Printer, Wand2, ChevronLeft,
  LayoutTemplate, Palette, Globe, Mail, Phone, MapPin, Linkedin, Github, Use, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  summary: string;
  skills: string;
  experience: Experience[];
  education: Education[];
  projects: Project[];
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
    summary: "",
    skills: "",
    experience: [],
    education: [],
    projects: []
  });

  // Calculation for completion progress
  const calculateProgress = () => {
    let score = 0;
    if (data.fullName) score += 10;
    if (data.email) score += 10;
    if (data.summary) score += 15;
    if (data.skills) score += 15;
    if (data.experience.length > 0) score += 25;
    if (data.education.length > 0) score += 15;
    if (data.projects.length > 0) score += 10;
    return Math.min(100, score);
  };

  const progress = calculateProgress();

  // Handlers
  const handleChange = (field: keyof ResumeData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
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
      education: [...prev.education, { id: Date.now().toString(), degree: "", school: "", year: "" }]
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
          <Button variant="outline" onClick={handlePrint} className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all shadow-sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all">
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
                <TabsList className="w-full grid grid-cols-5 mb-8 bg-white/5 text-muted-foreground border border-white/10 p-1 h-auto rounded-xl">
                  <TabsTrigger value="personal" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><User className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="experience" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><Briefcase className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="education" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><GraduationCap className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="skills" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><Code className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="projects" className="data-[state=active]:bg-white/10 data-[state=active]:text-white py-2.5 rounded-lg transition-all"><LayoutTemplate className="w-4 h-4" /></TabsTrigger>
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
                            <Label className="text-zinc-400 font-normal">Email</Label>
                            <Input placeholder="e.g. john@example.com" value={data.email} onChange={(e) => handleChange('email', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-zinc-400 font-normal">Phone</Label>
                            <Input placeholder="e.g. +1 234 567 890" value={data.phone} onChange={(e) => handleChange('phone', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 font-normal">Location</Label>
                            <Input placeholder="e.g. New York, NY" value={data.location} onChange={(e) => handleChange('location', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20 text-white placeholder:text-white/20" />
                          </div>
                        </div>
                        <div className="space-y-3">
                           <Label className="text-zinc-400 font-normal">Social Links</Label>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                           <div className="space-y-2">
                             <Label className="text-zinc-400 text-xs uppercase tracking-wider">Year / Duration</Label>
                             <Input placeholder="e.g. 2016 - 2020" value={edu.year} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} className="bg-white/5 border-white/10 focus:border-amber-500/50 text-white h-9" />
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

            <div className="print-container bg-white shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[210mm] min-h-[297mm] p-[10mm] text-left text-sm text-gray-800 transition-all duration-300 ease-in-out origin-top transform scale-[0.65] md:scale-[0.75] lg:scale-[0.85] xl:scale-95 ml-auto mr-auto relative group z-10">
                
                {/* Header */}
                <div className="border-b-2 border-gray-900 pb-6 mb-8 mt-2">
                    <h1 className="text-5xl font-bold uppercase tracking-tight text-gray-900 mb-4">{data.fullName || "Your Name"}</h1>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-gray-600 font-medium">
                        {data.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{data.email}</div>}
                        {data.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{data.phone}</div>}
                        {data.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{data.location}</div>}
                    </div>
                     <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-blue-700 font-medium mt-3">
                        {data.linkedin && <div className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" />{data.linkedin}</div>}
                        {data.github && <div className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" />{data.github}</div>}
                        {data.website && <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{data.website}</div>}
                    </div>
                </div>

                {/* Summary */}
                {data.summary && (
                  <div className="mb-8">
                      <h2 className="text-sm font-bold uppercase border-b-2 border-gray-200 pb-2 mb-3 tracking-wide text-gray-800 flex items-center gap-2">
                        Profile
                      </h2>
                      <p className="text-gray-700 leading-relaxed text-justify text-[13px]">{data.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {data.experience.length > 0 && (
                  <div className="mb-8">
                      <h2 className="text-sm font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4 tracking-wide text-gray-800">Experience</h2>
                      <div className="space-y-6">
                        {data.experience.map(exp => (
                          <div key={exp.id}>
                              <div className="flex justify-between items-baseline mb-1">
                                  <h3 className="font-bold text-[15px] text-gray-900">{exp.role}</h3>
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{exp.duration}</span>
                              </div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">{exp.company}</div>
                              <p className="text-gray-600 text-[13px] whitespace-pre-line leading-relaxed">{exp.description}</p>
                          </div>
                        ))}
                      </div>
                  </div>
                )}

                 {/* Projects */}
                {data.projects.length > 0 && (
                  <div className="mb-8">
                      <h2 className="text-sm font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4 tracking-wide text-gray-800">Projects</h2>
                      <div className="grid grid-cols-1 gap-4">
                        {data.projects.map(proj => (
                          <div key={proj.id} className="pb-2">
                              <div className="flex justify-between items-baseline mb-1">
                                  <h3 className="font-bold text-[15px] text-gray-900 flex items-center gap-2">
                                    {proj.name}
                                    {proj.link && <a href={`https://${proj.link.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="text-blue-600 no-underline"><Globe className="w-3 h-3" /></a>}
                                  </h3>
                              </div>
                              <p className="text-gray-600 text-[13px] leading-normal">{proj.description}</p>
                          </div>
                        ))}
                      </div>
                  </div>
                )}

                {/* Education */}
                {data.education.length > 0 && (
                  <div className="mb-8">
                      <h2 className="text-sm font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4 tracking-wide text-gray-800">Education</h2>
                      <div className="space-y-4">
                         {data.education.map(edu => (
                            <div key={edu.id}>
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-bold text-[15px] text-gray-900">{edu.school}</h3>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{edu.year}</span>
                                </div>
                                <div className="text-[13px] text-gray-700 font-medium">{edu.degree}</div>
                            </div>
                         ))}
                      </div>
                  </div>
                )}

                {/* Skills */}
                {data.skills && (
                  <div className="mb-8">
                      <h2 className="text-sm font-bold uppercase border-b-2 border-gray-200 pb-2 mb-3 tracking-wide text-gray-800">Technical Skills</h2>
                      <div className="flex flex-wrap gap-x-2 gap-y-2 text-[13px] text-gray-800 font-medium">
                        {data.skills.split(',').map((skill, i) => (
                           <span key={i} className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded text-gray-700">{skill.trim()}</span>
                        ))}
                      </div>
                  </div>
                )}
            </div>
        </div>

      </main>
    </div>
  );
};

export default ResumeBuilder;
