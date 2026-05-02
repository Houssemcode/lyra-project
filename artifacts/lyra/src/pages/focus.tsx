import { useState, useEffect, useRef, useCallback } from "react";
import {
  useGetFocusStats,
  useListFocusSessions,
  useCreateFocusSession,
  useDeleteFocusSession,
  getGetFocusStatsQueryKey,
  getListFocusSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, Timer, Trash2, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { motion } from "framer-motion";

type Phase = "work" | "break";

export default function Focus() {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [phase, setPhase] = useState<Phase>("work");
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [running, setRunning] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetFocusStats();
  const { data: sessions, isLoading: sessionsLoading } = useListFocusSessions({ date: today });
  const createSession = useCreateFocusSession();
  const deleteSession = useDeleteFocusSession();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetFocusStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFocusSessionsQueryKey({ date: today }) });
    queryClient.invalidateQueries({ queryKey: getListFocusSessionsQueryKey() });
  }

  // Reset timer when duration changes (if not running)
  useEffect(() => {
    if (!running) {
      setTimeLeft(phase === "work" ? workDuration * 60 : breakDuration * 60);
    }
  }, [workDuration, breakDuration, phase, running]);

  const completeSession = useCallback(
    (interrupted: boolean) => {
      if (sessionStart && phase === "work") {
        const now = new Date();
        const elapsed = Math.round((now.getTime() - sessionStart.getTime()) / 60000);
        const duration = interrupted ? elapsed : workDuration;
        createSession.mutate(
          {
            data: {
              durationMinutes: Math.max(1, duration),
              status: interrupted ? "interrupted" : "completed",
              startedAt: sessionStart.toISOString(),
              endedAt: now.toISOString(),
            },
          },
          { onSuccess: invalidate }
        );
      }
    },
    [sessionStart, phase, workDuration]
  );

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            completeSession(false);
            // Switch phase
            const nextPhase: Phase = phase === "work" ? "break" : "work";
            setPhase(nextPhase);
            setTimeLeft(nextPhase === "work" ? workDuration * 60 : breakDuration * 60);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, workDuration, breakDuration, completeSession]);

  function handleStart() {
    if (!running && !sessionStart) setSessionStart(new Date());
    setRunning(true);
  }

  function handlePause() {
    setRunning(false);
  }

  function handleReset() {
    setRunning(false);
    if (sessionStart) completeSession(true);
    setSessionStart(null);
    setPhase("work");
    setTimeLeft(workDuration * 60);
  }

  function handleDelete(id: string) {
    deleteSession.mutate({ id }, { onSuccess: invalidate });
  }

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  const totalTime = (phase === "work" ? workDuration : breakDuration) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const chartData = stats?.dailyBreakdown ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Focus</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pomodoro timer and deep work analytics</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Timer */}
        <div className="bg-card border border-card-border rounded-2xl p-6 flex flex-col items-center gap-5">
          {/* Phase indicator */}
          <div className="flex gap-2">
            <button
              onClick={() => { setPhase("work"); setRunning(false); setSessionStart(null); setTimeLeft(workDuration * 60); }}
              className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full transition-colors ${phase === "work" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              data-testid="button-phase-work"
            >
              <Timer size={13} /> Work
            </button>
            <button
              onClick={() => { setPhase("break"); setRunning(false); setSessionStart(null); setTimeLeft(breakDuration * 60); }}
              className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full transition-colors ${phase === "break" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              data-testid="button-phase-break"
            >
              <Coffee size={13} /> Break
            </button>
          </div>

          {/* Circular progress */}
          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums" style={{ fontFamily: "var(--app-font-display)" }}>{minutes}:{seconds}</span>
              <span className="text-xs text-muted-foreground capitalize mt-1">{phase}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {running ? (
              <Button variant="outline" onClick={handlePause} data-testid="button-pause-timer">
                <Pause size={16} className="mr-1.5" /> Pause
              </Button>
            ) : (
              <Button onClick={handleStart} data-testid="button-start-timer">
                <Play size={16} className="mr-1.5" /> {sessionStart ? "Resume" : "Start"}
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleReset} data-testid="button-reset-timer">
              <RotateCcw size={15} />
            </Button>
          </div>

          {/* Duration settings */}
          <div className="w-full space-y-3 pt-2 border-t border-border">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Work duration</span><span className="font-medium text-foreground">{workDuration} min</span>
              </div>
              <Slider
                value={[workDuration]}
                onValueChange={([v]) => setWorkDuration(v)}
                min={5} max={60} step={5}
                disabled={running}
                data-testid="slider-work-duration"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Break duration</span><span className="font-medium text-foreground">{breakDuration} min</span>
              </div>
              <Slider
                value={[breakDuration]}
                onValueChange={([v]) => setBreakDuration(v)}
                min={1} max={30} step={1}
                disabled={running}
                data-testid="slider-break-duration"
              />
            </div>
          </div>
        </div>

        {/* Stats + chart */}
        <div className="space-y-4">
          {/* Today stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-card-border rounded-xl p-4">
              {statsLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
                <p className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--app-font-display)" }}>{stats?.todayMinutes ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Minutes today</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              {statsLoading ? <Skeleton className="h-8 w-10 mb-1" /> : (
                <p className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--app-font-display)" }}>{stats?.todaySessions ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Sessions today</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              {statsLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>{stats?.weekMinutes ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Minutes this week</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              {statsLoading ? <Skeleton className="h-8 w-10 mb-1" /> : (
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>{stats?.weekSessions ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Sessions this week</p>
            </div>
          </div>

          {/* Weekly chart */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weekly Focus (min)</p>
            {statsLoading ? <Skeleton className="h-32 w-full" /> : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData} barSize={20}>
                  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d + "T12:00:00"), "EEE")} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(d) => format(new Date(d + "T12:00:00"), "EEE, MMM d")}
                    formatter={(v: number) => [`${v} min`, "Focus"]}
                  />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Today's sessions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today's Sessions</h2>
        {sessionsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : sessions?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No sessions logged today. Start the timer above!</p>
        ) : (
          <div className="space-y-2">
            {sessions?.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-card border border-card-border rounded-xl px-4 py-3 group"
                data-testid={`session-${s.id}`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === "completed" ? "bg-primary" : "bg-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.taskTitle ?? "Focus session"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.durationMinutes} min · {format(new Date(s.startedAt), "HH:mm")} · {s.status}
                  </p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                  onClick={() => handleDelete(s.id)}
                  data-testid={`button-delete-session-${s.id}`}
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
