
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, AlertCircle, TrendingUp, Download, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import ResumeAnalysisDisplay from "./ResumeAnalysisDisplay";
import { extractResumeText } from "@/utils/pdfParser";

interface ResumeAnalyzerProps {
    userId: string;
    resumeUrl?: string;
}

const ResumeAnalyzer = ({ userId, resumeUrl }: ResumeAnalyzerProps) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        loadAnalysisHistory();
    }, [userId]);

    // Reset analysis when resumeUrl changes (new upload)
    useEffect(() => {
        if (resumeUrl) {
            setAnalysis(null);
        }
    }, [resumeUrl]);

    const loadAnalysisHistory = async () => {
        try {
            const { data } = await supabase
                .from("resume_analyses")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(5);

            if (data) {
                setHistory(data);
                if (data.length > 0) {
                    setAnalysis(data[0].analysis_result);
                }
            }
        } catch (error) {
            console.error("Error loading analysis history:", error);
        }
    };

    const analyzeResume = async () => {
        if (!resumeUrl) {
            toast.error("Please upload a resume first");
            return;
        }

        setAnalyzing(true);
        try {
            // 1. Fetch and Extract Text
            const resumeResponse = await fetch(resumeUrl);
            const resumeBlob = await resumeResponse.blob();
            // Convert Blob to File to match the utility interface
            const file = new File([resumeBlob], "resume.pdf", { type: "application/pdf" });

            const resumeText = await extractResumeText(file);

            // 3. Send to AI
            toast.info("Analyzing content...");
            const { data, error } = await supabase.functions.invoke("analyze-resume", {
                body: {
                    resumeUrl,
                    resumeText
                }
            });

            if (error) throw error;

            if (data) {
                setAnalysis(data);
                toast.success("Resume analyzed successfully!");
                loadAnalysisHistory();
            }
        } catch (error: any) {
            console.error("Error analyzing resume:", error);
            toast.error(error.message || "Failed to analyze resume");
        } finally {
            setAnalyzing(false);
        }
    };



    return (
        <div className="space-y-6">
            {/* Analyze Button */}
            {resumeUrl && !analysis && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 text-center">
                        <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                        <p className="text-muted-foreground mb-4">
                            Get AI-powered feedback on your resume's ATS compatibility and content quality
                        </p>
                        <Button onClick={analyzeResume} disabled={analyzing} size="lg">
                            {analyzing ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="mr-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                    </motion.div>
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Analyze Resume
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Analysis Results */}
            <AnimatePresence>
                {analysis && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold">Analysis Results</h3>
                            <Button variant="outline" size="sm" onClick={analyzeResume} disabled={analyzing}>
                                {analyzing ? (
                                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                )}
                                Re-analyze
                            </Button>
                        </div>
                        <ResumeAnalysisDisplay analysis={analysis} />
                    </div>
                )}
            </AnimatePresence>

            {/* Analysis History */}
            {history.length > 1 && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Analysis History</CardTitle>
                        <CardDescription>Your past resume analyses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {history.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => setAnalysis(item.analysis_result)}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                ATS Score: {item.ats_score}%
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={index === 0 ? "default" : "secondary"}>
                                        {index === 0 ? "Latest" : "Previous"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ResumeAnalyzer;
