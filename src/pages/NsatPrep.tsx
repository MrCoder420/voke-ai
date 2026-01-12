
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket } from "lucide-react";

const NsatPrep = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 bg-violet-100 p-4 rounded-full dark:bg-violet-900/30">
        <Rocket className="w-12 h-12 text-violet-600 dark:text-violet-400" />
      </div>
      <h1 className="text-3xl font-bold mb-4">NSAT Prep Coming Soon</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We are working hard to bring you the best preparation materials for NSAT. 
        Stay tuned!
      </p>
      <Button onClick={() => navigate(-1)} variant="outline">
        <ArrowLeft className="mr-2 w-4 h-4" /> Go Back
      </Button>
    </div>
  );
};

export default NsatPrep;
