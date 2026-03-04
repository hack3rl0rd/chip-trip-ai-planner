import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Planning from "./pages/Planning";
import Result from "./pages/Result";
import SavedPlans from "./pages/SavedPlans";
import LocationDetail from "./pages/LocationDetail";
import Auth from "./pages/Auth";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import MobileNav from "./components/MobileNav";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/result" element={<Result />} />
            <Route path="/saved" element={<SavedPlans />} />
            <Route path="/location" element={<LocationDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
