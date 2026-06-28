import { useEffect, useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createContext, useContext } from "react";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
}
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
import SignInPage from "@/pages/auth/sign-in";
import SignUpPage from "@/pages/auth/sign-up";

const queryClient = new QueryClient();

// ─── Theme context ────────────────────────────────────────────────────────────
type Theme = "dark" | "light";
interface ThemeContextValue { theme: Theme; toggleTheme: () => void; }
export const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggleTheme: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("lyra_theme") as Theme | null;
    return stored ?? "dark";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("lyra_theme", theme);
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Auth context ─────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  signOut: () => {},
});

export function useAuth() { return useContext(AuthContext); }

const TOKEN_KEY = "lyra_auth_token";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // Wire token into the API client
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  // Validate stored token on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data: AuthUser) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, displayName?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password, display_name: displayName || username }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(err.detail || "Registration failed");
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Landing page ────────────────────────────────────────────────────────────
function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
        <span className="text-primary-foreground font-bold text-2xl" style={{ fontFamily: "var(--app-font-display)" }}>L</span>
      </div>
      <p className="text-xs tracking-[0.2em] uppercase text-primary mb-3 font-medium">Personal Productivity</p>
      <h1 className="text-4xl font-bold mb-3 text-foreground" style={{ fontFamily: "var(--app-font-display)" }}>
        Welcome to Lyra
      </h1>
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
        Your personal companion for tasks, habits, prayers, and spiritual growth — all in one place.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setLocation("/sign-up")}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
        >
          Get Started
        </button>
        <button
          onClick={() => setLocation("/sign-in")}
          className="px-6 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-accent transition-colors"
        >
          Sign In
        </button>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-3 text-left max-w-xs w-full">
        {[
          { emoji: "✅", label: "Tasks & habits" },
          { emoji: "🕌", label: "Prayer tracker" },
          { emoji: "📖", label: "Quran & deeds" },
          { emoji: "⏱️", label: "Focus sessions" },
        ].map(({ emoji, label }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{emoji}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Auth loading screen ──────────────────────────────────────────────────────
function AuthLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-bold text-lg" style={{ fontFamily: "var(--app-font-display)" }}>L</span>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ─── Authenticated app shell ──────────────────────────────────────────────────
function AuthenticatedApp() {
  const { user } = useAuth();
  const onboardingKey = `lyra_onboarding_done_${user?.id ?? ""}`;
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem(onboardingKey));

  return (
    <>
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
      <NotificationScheduler />
      {!onboardingDone && (
        <OnboardingWizard
          onComplete={() => {
            localStorage.setItem(onboardingKey, "1");
            setOnboardingDone(true);
          }}
        />
      )}
    </>
  );
}

// ─── App shell: auth-gated ────────────────────────────────────────────────────
function AppShell() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return <AuthLoading />;

  // Signed-in users go to the app
  if (user) {
    // Redirect away from auth pages
    if (location === "/sign-in" || location === "/sign-up") {
      return <Redirect to="/" />;
    }
    return <AuthenticatedApp />;
  }

  // Not signed in
  return (
    <Switch>
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/" component={LandingPage} />
      <Route>{() => <Redirect to="/sign-in" />}</Route>
    </Switch>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <AppShell />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
