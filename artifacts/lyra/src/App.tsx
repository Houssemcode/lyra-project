import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import Home from "@/pages/home";
import Tasks from "@/pages/tasks";
import Habits from "@/pages/habits";
import Calendar from "@/pages/calendar";
import Prayers from "@/pages/prayers";
import Focus from "@/pages/focus";
import Summary from "@/pages/summary";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  return <>{children}</>;
}

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
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
