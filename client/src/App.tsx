import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import DashboardHome from "./pages/DashboardHome";
import ThinkingSession from "./pages/ThinkingSession";
import Analytics from "./pages/Analytics";
import SessionHistory from "./pages/SessionHistory";
import Subscription from "./pages/Subscription";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={DashboardHome} />
      <Route path="/dashboard/session" component={ThinkingSession} />
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
