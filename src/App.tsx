import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/features/auth/useAuth";
import { trackPageView } from "@/lib/analytics";
import Index from "@/app/pages/Index";
import MobileNav from "@/components/MobileNav";
import { ChatWidget } from "@/features/chat/ChatWidget";

// Code-split theo route — giảm first load (bundle gộp ~1.3MB trước đây)
const Planning = lazy(() => import("@/app/pages/Planning"));
const Result = lazy(() => import("@/app/pages/Result"));
const SavedPlans = lazy(() => import("@/app/pages/SavedPlans"));
const LocationDetail = lazy(() => import("@/app/pages/LocationDetail"));
const ExplorePage = lazy(() => import("@/features/explore/pages/ExplorePage"));
const TripPublicViewPage = lazy(() => import("@/features/explore/pages/TripPublicViewPage"));
const JoinTripPage = lazy(() => import("@/features/explore/pages/JoinTripPage"));
const Auth = lazy(() => import("@/app/pages/Auth"));
const Premium = lazy(() => import("@/app/pages/Premium"));
const Checkout = lazy(() => import("@/app/pages/Checkout"));
const PaymentSuccess = lazy(() => import("@/app/pages/PaymentSuccess"));
const Profile = lazy(() => import("@/app/pages/Profile"));
const AdminUsers = lazy(() => import("@/features/admin/AdminUsers"));
const AdminLogin = lazy(() => import("@/features/admin/AdminLogin"));
const AdminChatInbox = lazy(() => import("@/features/admin/AdminChatInbox"));
const NotFound = lazy(() => import("@/app/pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
  </div>
);

const RouteAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" offset={{ top: 72, right: 16 }} />
      <BrowserRouter>
        <AuthProvider>
          <RouteAnalytics />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/result" element={<Result />} />
              <Route path="/saved" element={<SavedPlans />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/trips/:tripId/public" element={<TripPublicViewPage />} />
              <Route path="/trips/join/:token" element={<JoinTripPage />} />
              <Route path="/location" element={<LocationDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<PaymentSuccess />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/chat" element={<AdminChatInbox />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <MobileNav />
          <ChatWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
