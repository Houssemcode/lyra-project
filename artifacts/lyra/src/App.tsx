import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createContext, useContext, useEffect, useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import { NotificationScheduler } from "@/components/notification-scheduler";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import Home from "@/pages/home";
import Tasks from "@/pages/tasks";
import Habits from "@/pages/habits";
import Calendar from "@/pages/calendar";
import Prayers from "@/pages/prayers";
import Focus from "@/pages/focus";
import Summary from "@/pages/summary";
import Islamic from "@/pages/islamic";
import Settings from "@/pages/settings";
import Progress from "@/pages/progress";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// ─── Theme context ────────────────────────────────────────────────────────────
type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("lyra_theme") as Theme | null;
    return stored ?? "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("lyra_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/habits" component={Habits} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/prayers" component={Prayers} />
        <Route path="/focus" component={Focus} />
        <Route path="/summary" component={Summary} />
        <Route path="/islamic" component={Islamic} />
        <Route path="/settings" component={Settings} />
        <Route path="/progress" component={Progress} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const ONBOARDING_KEY = "lyra_onboarding_done";

function App() {
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem(ONBOARDING_KEY)
  );

  function completeOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setOnboardingDone(true);
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NotificationScheduler />
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          {!onboardingDone && <OnboardingWizard onComplete={completeOnboarding} />}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
