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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard" component={DashboardHome} />
      <Route path="/dashboard/diagnostic" component={Diagnostic} />
      <Route path="/dashboard/argue" component={Argue} />
      <Route path="/dashboard/session" component={ThinkingSession} />
      <Route path="/dashboard/arena" component={Arena} />
      <Route path="/dashboard/analytics" component={Analytics} />
      <Route path="/dashboard/history" component={SessionHistory} />
      <Route path="/dashboard/subscription" component={Subscription} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
