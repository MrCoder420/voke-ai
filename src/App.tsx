import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Blogs from "./pages/Blogs";
import AdminUserDetails from "./pages/AdminUserDetails";

import LearningPaths from "./pages/LearningPaths";
import InterviewNew from "./pages/InterviewNew";
import InterviewResults from "./pages/InterviewResults";
import InterviewSession from "./pages/InterviewSession";
import VideoInterview from "./pages/VideoInterview";
import VoiceAssistant from "./pages/VoiceAssistant";
import VideoInterviewResults from "./pages/VideoInterviewResults";
import TimedVideoInterviewResults from "./pages/TimedVideoInterviewResults";
import VoiceInterviewResults from "./pages/VoiceInterviewResults";
import MultiQuestionResults from "./pages/MultiQuestionResults";
import VideoPracticeHistory from "./pages/VideoPracticeHistory";
import ProgressAnalytics from "./pages/ProgressAnalytics";

import AdaptiveInterview from "./pages/AdaptiveInterview";
import PeerInterviews from "./pages/PeerInterviews";
import CreatePeerSession from "./pages/CreatePeerSession";
import PeerSessionRoom from "./pages/PeerSessionRoom";
import RatePeerSession from "./pages/RatePeerSession";
import Leaderboard from "./pages/Leaderboard";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Community from "./pages/Community";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import DailyChallenge from "./pages/DailyChallenge";
import JobRecommendations from "./pages/JobRecommendations";
import QuestionPractice from "./pages/QuestionPractice";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Playground from "./pages/Playground";
import Pricing from "./pages/Pricing";
import ElitePrep from "./pages/ElitePrep";
import CareerPlanView from "./pages/CareerPlanView";
import ResumeBuilder from "./pages/ResumeBuilder";
import NotFound from "./pages/NotFound";
import { Footer } from "./components/Footer";
import GlobalAIChatbot from "./components/GlobalAIChatbot";
import { OnlinePresenceProvider } from "./components/OnlinePresenceProvider";
import { SessionRequestNotifier } from "./components/SessionRequestNotifier";
import { ProfileCompletionGuard } from "./components/ProfileCompletionGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OnlinePresenceProvider>
        <BrowserRouter>
          <ProfileCompletionGuard>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/blogs" element={<Blogs />} />
              <Route path="/community" element={<Community />} />
              <Route path="/learning-paths" element={<LearningPaths />} />
              <Route path="/interview/new" element={<InterviewNew />} />
              <Route path="/interview/results/:id" element={<InterviewResults />} />
              <Route path="/interview/:id" element={<InterviewSession />} />
              <Route path="/video-interview" element={<VideoInterview />} />
              <Route path="/video-interview/results/:id" element={<VideoInterviewResults />} />
              <Route path="/timed-interview/results/:id" element={<TimedVideoInterviewResults />} />
              <Route path="/voice-interview/results/:id" element={<VoiceInterviewResults />} />
              <Route path="/multi-question-results/:sessionId" element={<MultiQuestionResults />} />
              <Route path="/voice-assistant" element={<VoiceAssistant />} />
              <Route path="/video-practice" element={<VideoPracticeHistory />} />
              <Route path="/progress-analytics" element={<ProgressAnalytics />} />

              <Route path="/adaptive-interview" element={<AdaptiveInterview />} />
              <Route path="/peer-interviews" element={<PeerInterviews />} />
              <Route path="/peer-interviews/create" element={<CreatePeerSession />} />
              <Route path="/peer-interviews/session/:sessionId" element={<PeerSessionRoom />} />
              <Route path="/peer-interviews/rate/:sessionId" element={<RatePeerSession />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/job-recommendations" element={<JobRecommendations />} />
              <Route path="/career-plan/:planId" element={<CareerPlanView />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/community" element={<Community />} />
              <Route path="/help" element={<Help />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/daily-challenge" element={<DailyChallenge />} />
              <Route path="/question-practice" element={<QuestionPractice />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:slug" element={<CompanyDetail />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/elite-prep" element={<ElitePrep />} />
              <Route path="/resume-builder" element={<ResumeBuilder />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProfileCompletionGuard>
          <GlobalAIChatbot />
          <SessionRequestNotifier />
        </BrowserRouter>
      </OnlinePresenceProvider>
    </TooltipProvider>
  </QueryClientProvider >
);

export default App;
