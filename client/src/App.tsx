import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import DashboardHome from "./pages/DashboardHome";
import Argue from "./pages/Argue";
import ThinkingSession from "./pages/ThinkingSession";
import Arena from "./pages/Arena";
import Analytics from "./pages/Analytics";
import SessionHistory from "./pages/SessionHistory";
import Subscription from "./pages/Subscription";
import Diagnostic from "./pages/Diagnostic";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Admin from "./pages/Admin";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";

// 공개: /, /about, /features, /pricing, /privacy, /login, /auth/callback, /dashboard/diagnostic, /404. 나머지는 로그인 필요.
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
