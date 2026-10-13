import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";
import Telemetry from "./components/Telemetry";

// 페이지는 라우트별 청크로 나눈다(특히 Landing의 three.js가 다른 화면으로 번지지 않게).
const Landing = lazy(() => import("./pages/Landing"));
const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const Argue = lazy(() => import("./pages/Argue"));
const ThinkingSession = lazy(() => import("./pages/ThinkingSession"));
const Arena = lazy(() => import("./pages/Arena"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SessionHistory = lazy(() => import("./pages/SessionHistory"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Admin = lazy(() => import("./pages/Admin"));
const Join = lazy(() => import("./pages/Join"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// 청크를 받는 동안 배경만 채워 레이아웃이 튀지 않게 한다.
const RouteFallback = () => <div aria-hidden="true" style={{ minHeight: "100dvh", background: "var(--l-bg)" }} />;

// 공개: /, /about, /features, /pricing, /privacy, /terms, /login, /auth/callback, /join, /dashboard/diagnostic, /404. 나머지는 로그인 필요.
const guard = (Page: React.ComponentType) => () => (
  <RequireAuth>
    <Page />
  </RequireAuth>
);

const GuardedDashboardHome = guard(DashboardHome);
const GuardedArgue = guard(Argue);
const GuardedThinkingSession = guard(ThinkingSession);
const GuardedArena = guard(Arena);
const GuardedAnalytics = guard(Analytics);
const GuardedSessionHistory = guard(SessionHistory);
const GuardedSubscription = guard(Subscription);
const GuardedSettings = guard(Settings);
const GuardedAdmin = guard(Admin);
const GuardedOnboarding = guard(Onboarding);

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/join" component={Join} />
      <Route path="/welcome" component={GuardedOnboarding} />
      <Route path="/dashboard/diagnostic" component={Diagnostic} />
      <Route path="/dashboard" component={GuardedDashboardHome} />
      <Route path="/dashboard/argue" component={GuardedArgue} />
      <Route path="/dashboard/session" component={GuardedThinkingSession} />
      <Route path="/dashboard/arena" component={GuardedArena} />
      <Route path="/dashboard/analytics" component={GuardedAnalytics} />
      <Route path="/dashboard/history" component={GuardedSessionHistory} />
      <Route path="/dashboard/subscription" component={GuardedSubscription} />
      <Route path="/dashboard/settings" component={GuardedSettings} />
      <Route path="/admin" component={GuardedAdmin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Telemetry />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
