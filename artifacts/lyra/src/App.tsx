import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createContext, useContext } from "react";
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

// ─── Clerk setup ──────────────────────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(186, 60%, 45%)",
    colorForeground: "hsl(210, 40%, 98%)",
    colorMutedForeground: "hsl(215, 20%, 50%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorBackground: "hsl(226, 30%, 8%)",
    colorInput: "hsl(226, 30%, 13%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(215, 20%, 25%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(226,30%,7%)] border border-[hsl(215,20%,15%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-semibold",
    headerSubtitle: "text-[hsl(215,20%,55%)]",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-[hsl(210,40%,90%)] text-sm",
    footerActionLink: "text-[hsl(186,60%,45%)] hover:text-[hsl(186,60%,55%)]",
    footerActionText: "text-[hsl(215,20%,50%)]",
    dividerText: "text-[hsl(215,20%,50%)]",
    identityPreviewEditButton: "text-[hsl(186,60%,45%)]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-white",
    logoBox: "mb-1",
    logoImage: "h-9 w-auto",
    socialButtonsBlockButton: "border-[hsl(215,20%,20%)] bg-[hsl(226,30%,12%)] hover:bg-[hsl(226,30%,16%)] text-white",
    formButtonPrimary: "bg-[hsl(186,60%,45%)] hover:bg-[hsl(186,60%,40%)] text-[hsl(226,30%,6%)] font-semibold",
    formFieldInput: "bg-[hsl(226,30%,12%)] border-[hsl(215,20%,20%)] text-white focus:border-[hsl(186,60%,45%)]",
    footerAction: "border-t border-[hsl(215,20%,13%)] mt-1",
    dividerLine: "bg-[hsl(215,20%,18%)]",
    alert: "border-[hsl(215,20%,20%)] bg-[hsl(226,30%,10%)]",
    otpCodeFieldInput: "bg-[hsl(226,30%,12%)] border-[hsl(215,20%,20%)] text-white",
  },
};

// ─── Auth pages ───────────────────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// ─── Landing page (signed-out on /) ──────────────────────────────────────────
function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
        <span
          className="text-primary-foreground font-bold text-2xl"
          style={{ fontFamily: "var(--app-font-display)" }}
        >
          L
        </span>
      </div>
      <p className="text-xs tracking-[0.2em] uppercase text-primary mb-3 font-medium">Personal Productivity</p>
      <h1
        className="text-4xl font-bold mb-3 text-foreground"
        style={{ fontFamily: "var(--app-font-display)" }}
      >
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

// ─── Redirect signed-out on protected routes ──────────────────────────────────
function LandingOrRedirect() {
  const [location] = useLocation();
  if (location === "/") return <LandingPage />;
  return <Redirect to="/sign-in" />;
}

// ─── Authenticated app shell ──────────────────────────────────────────────────
function AuthenticatedApp() {
  const { user } = useUser();
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
  return (
    <>
      <Show when="signed-in">
        <AuthenticatedApp />
      </Show>
      <Show when="signed-out">
        <LandingOrRedirect />
      </Show>
    </>
  );
}

// ─── Query cache invalidator on user switch ───────────────────────────────────
function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== uid) {
        qc.clear();
      }
      prevRef.current = uid;
    });
  }, [addListener, qc]);
  return null;
}

// ─── ClerkProvider + wouter routing ──────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: { title: "Welcome back", subtitle: "Sign in to your Lyra account" },
        },
        signUp: {
          start: { title: "Create your account", subtitle: "Your personal productivity companion" },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryCacheInvalidator />
        <ThemeProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route component={AppShell} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
