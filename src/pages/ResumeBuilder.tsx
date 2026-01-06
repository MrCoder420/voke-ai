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
  LayoutTemplate, Palette, Globe, Mail, Phone, MapPin, Linkedin, Github
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
    <div className="min-h-screen bg-background flex flex-col font-sans">
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
            }
            /* Hide URL headers/footers if possible in browser settings, but CSS can try */
            @page { margin: 0.5cm; }
          }
        `}
      </style>

      {/* Header */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-20 no-print sticky top-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Resume Builder</h1>
              <p className="text-xs text-muted-foreground">AI-Powered • ATS Friendly</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-1/3">
           <div className="flex-1">
             <div className="flex justify-between text-xs mb-1">
               <span>Completion</span>
               <span>{progress}%</span>
             </div>
             <Progress value={progress} className="h-2" />
           </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Editor Panel */}
        <div className="w-[45%] border-r border-border bg-muted/10 flex flex-col no-print">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-xl mx-auto space-y-8">
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-5 mb-6">
                  <TabsTrigger value="personal"><User className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="experience"><Briefcase className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="education"><GraduationCap className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="skills"><Code className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="projects"><LayoutTemplate className="w-4 h-4" /></TabsTrigger>
                </TabsList>

                {/* Personal Info Tab */}
                <TabsContent value="personal" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Your contact details and professional title.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input placeholder="John Doe" value={data.fullName} onChange={(e) => handleChange('fullName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input placeholder="john@example.com" value={data.email} onChange={(e) => handleChange('email', e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input placeholder="+1 234 567 890" value={data.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input placeholder="New York, NY" value={data.location} onChange={(e) => handleChange('location', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                         <Label>Links</Label>
                         <div className="grid grid-cols-3 gap-2">
                            <Input placeholder="LinkedIn URL" value={data.linkedin} onChange={(e) => handleChange('linkedin', e.target.value)} />
                            <Input placeholder="GitHub URL" value={data.github} onChange={(e) => handleChange('github', e.target.value)} />
                            <Input placeholder="Website / Portfolio" value={data.website} onChange={(e) => handleChange('website', e.target.value)} />
                         </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Professional Summary</Label>
                          <Button variant="ghost" size="sm" className="text-violet-500 h-6" onClick={handleAiEnhance} disabled={isAiEnhancing}>
                            {isAiEnhancing ? <Wand2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                            AI Enhance
                          </Button>
                        </div>
                        <Textarea 
                          placeholder="Briefly describe your professional background and goals..." 
                          className="h-32 resize-none"
                          value={data.summary}
                          onChange={(e) => handleChange('summary', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Experience Tab */}
                <TabsContent value="experience" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Work History</h3>
                    <Button size="sm" onClick={addExperience}><Plus className="w-4 h-4 mr-2" /> Add Job</Button>
                  </div>
                  {data.experience.map((exp, index) => (
                     <Card key={exp.id} className="relative group">
                       <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExperience(exp.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                       <CardContent className="pt-6 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label>Job Title</Label>
                             <Input placeholder="Software Engineer" value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} />
                           </div>
                           <div className="space-y-2">
                             <Label>Company</Label>
                             <Input placeholder="Tech Corp" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label>Duration</Label>
                           <Input placeholder="Jan 2020 - Present" value={exp.duration} onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)} />
                         </div>
                         <div className="space-y-2">
                           <Label>Description</Label>
                           <Textarea 
                              placeholder="Key achievements and responsibilities..." 
                              className="h-24 resize-none"
                              value={exp.description} 
                              onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} 
                           />
                         </div>
                       </CardContent>
                     </Card>
                  ))}
                  {data.experience.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                      No experience added yet.
                    </div>
                  )}
                </TabsContent>
                
                {/* Education Tab */}
                <TabsContent value="education" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Education</h3>
                    <Button size="sm" onClick={addEducation}><Plus className="w-4 h-4 mr-2" /> Add School</Button>
                  </div>
                  {data.education.map((edu) => (
                     <Card key={edu.id} className="relative group">
                       <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeEducation(edu.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                       <CardContent className="pt-6 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label>Degree / Major</Label>
                             <Input placeholder="BS Computer Science" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} />
                           </div>
                           <div className="space-y-2">
                             <Label>School / University</Label>
                             <Input placeholder="University of Tech" value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label>Year / Duration</Label>
                           <Input placeholder="2016 - 2020" value={edu.year} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} />
                         </div>
                       </CardContent>
                     </Card>
                  ))}
                </TabsContent>

                {/* Projects Tab */}
                 <TabsContent value="projects" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Projects</h3>
                    <Button size="sm" onClick={addProject}><Plus className="w-4 h-4 mr-2" /> Add Project</Button>
                  </div>
                  {data.projects.map((proj) => (
                     <Card key={proj.id} className="relative group">
                       <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeProject(proj.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                       <CardContent className="pt-6 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label>Project Name</Label>
                             <Input placeholder="E-commerce App" value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} />
                           </div>
                           <div className="space-y-2">
                             <Label>Link (Optional)</Label>
                             <Input placeholder="github.com/..." value={proj.link} onChange={(e) => updateProject(proj.id, 'link', e.target.value)} />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label>Description</Label>
                           <Textarea 
                              placeholder="Technologies used, role, outcome..." 
                              className="h-20 resize-none"
                              value={proj.description} 
                              onChange={(e) => updateProject(proj.id, 'description', e.target.value)} 
                           />
                         </div>
                       </CardContent>
                     </Card>
                  ))}
                </TabsContent>


                {/* Skills Tab */}
                <TabsContent value="skills" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills & Expertise</CardTitle>
                      <CardDescription>Comma separated list of your technical skills.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label>Technical Skills</Label>
                          <Textarea 
                            placeholder="React, TypeScript, Node.js, Python, AWS, Docker..." 
                            className="h-40"
                            value={data.skills}
                            onChange={(e) => handleChange('skills', e.target.value)}
                          />
                      </div>
                      <div className="mt-4">
                        <Label className="mb-2 block">Preview</Label>
                        <div className="flex flex-wrap gap-2">
                          {data.skills.split(',').map((skill, i) => skill.trim() && (
                            <Badge key={i} variant="secondary">{skill.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: Live Preview (Canvas) */}
        <div className="flex-[1.2] bg-gray-50/50 p-8 overflow-y-auto flex items-start justify-center">
            <div className="print-container bg-white shadow-2xl w-[210mm] min-h-[297mm] p-[10mm] text-left text-sm text-gray-800 transition-all duration-300 ease-in-out origin-top transform scale-[0.85] lg:scale-100 relative group">
                
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-4 mb-6">
                    <h1 className="text-4xl font-bold uppercase tracking-tight text-gray-900 mb-2">{data.fullName || "Your Name"}</h1>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 font-medium">
                        {data.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{data.email}</div>}
                        {data.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{data.phone}</div>}
                        {data.location && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{data.location}</div>}
                    </div>
                     <div className="flex flex-wrap gap-3 text-xs text-blue-600 font-medium mt-2">
                        {data.linkedin && <div className="flex items-center gap-1"><Linkedin className="w-3 h-3" />{data.linkedin}</div>}
                        {data.github && <div className="flex items-center gap-1"><Github className="w-3 h-3" />{data.github}</div>}
                        {data.website && <div className="flex items-center gap-1"><Globe className="w-3 h-3" />{data.website}</div>}
                    </div>
                </div>

                {/* Summary */}
                {data.summary && (
                  <div className="mb-6">
                      <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-2 tracking-wide text-gray-700">Professional Summary</h2>
                      <p className="text-gray-700 leading-relaxed text-justify text-[13px]">{data.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {data.experience.length > 0 && (
                  <div className="mb-6">
                      <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3 tracking-wide text-gray-700">Experience</h2>
                      <div className="space-y-4">
                        {data.experience.map(exp => (
                          <div key={exp.id}>
                              <div className="flex justify-between items-baseline mb-1">
                                  <h3 className="font-bold text-gray-900">{exp.role}</h3>
                                  <span className="text-xs font-semibold text-gray-500">{exp.duration}</span>
                              </div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">{exp.company}</div>
                              <p className="text-gray-600 text-[12px] whitespace-pre-line leading-relaxed">{exp.description}</p>
                          </div>
                        ))}
                      </div>
                  </div>
                )}

                 {/* Projects */}
                {data.projects.length > 0 && (
                  <div className="mb-6">
                      <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3 tracking-wide text-gray-700">Key Projects</h2>
                      <div className="grid grid-cols-1 gap-3">
                        {data.projects.map(proj => (
                          <div key={proj.id}>
                              <div className="flex justify-between items-baseline">
                                  <h3 className="font-bold text-gray-900 flex items-center gap-1">
                                    {proj.name}
                                    {proj.link && <Globe className="w-3 h-3 text-blue-500 opacity-50" />}
                                  </h3>
                              </div>
                              <p className="text-gray-600 text-[12px] leading-relaxed mt-0.5">{proj.description}</p>
                          </div>
                        ))}
                      </div>
                  </div>
                )}

                {/* Education */}
                {data.education.length > 0 && (
                  <div className="mb-6">
                      <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3 tracking-wide text-gray-700">Education</h2>
                      <div className="space-y-3">
                         {data.education.map(edu => (
                            <div key={edu.id}>
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-bold text-gray-900">{edu.school}</h3>
                                    <span className="text-xs font-semibold text-gray-500">{edu.year}</span>
                                </div>
                                <div className="text-xs text-gray-700">{edu.degree}</div>
                            </div>
                         ))}
                      </div>
                  </div>
                )}

                {/* Skills */}
                {data.skills && (
                  <div className="mb-6">
                      <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-2 tracking-wide text-gray-700">Skills</h2>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-gray-700 font-medium">
                        {data.skills.split(',').map((skill, i) => (
                           <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-gray-800">{skill.trim()}</span>
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
