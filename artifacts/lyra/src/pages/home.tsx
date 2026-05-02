import {
  useGetTodayTasks,
  useGetTodayHabits,
  useListPrayers,
  useGetFocusStats,
  useListEvents,
  useGetQuranProgress,
  useListDeedLogs,
  useListDeeds,
} from "@workspace/api-client-react";
import { CheckCircle2, Circle, Flame, Moon, Timer, CalendarDays, ChevronRight, Star, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

function getHijriDate(): string {
  return new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "As-salamu alaykum";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayTasks, isLoading: tasksLoading } = useGetTodayTasks();
  const { data: todayHabits, isLoading: habitsLoading } = useGetTodayHabits();
  const { data: prayers, isLoading: prayersLoading } = useListPrayers({ date: today });
  const { data: focusStats, isLoading: focusLoading } = useGetFocusStats();
  const { data: events, isLoading: eventsLoading } = useListEvents({ start: today, end: today });
  const { data: quran } = useGetQuranProgress();
  const { data: todayLogs } = useListDeedLogs({ date: today });
  const { data: todayDeeds } = useListDeeds({ todayOnly: true });

  const prayersDone = prayers?.filter((p) => p.status === "on_time" || p.status === "late").length ?? 0;
  const habitsCompleted = todayHabits?.filter((h) => h.todayStatus === "completed").length ?? 0;
  const todayEvents = events?.slice(0, 3) ?? [];
  const deedsCompleted = todayLogs?.length ?? 0;
  const deedsTotal = todayDeeds?.length ?? 0;
  const hijri = getHijriDate();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        <div className="flex items-end justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold mt-0.5" style={{ fontFamily: "var(--app-font-display)" }}>
            {getGreeting()}
          </h1>
          <span className="text-xs text-muted-foreground/70 pb-0.5">{hijri}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 size={18} className="text-primary" />}
          label="Tasks done"
          value={tasksLoading ? null : `${todayTasks?.done ?? 0} / ${todayTasks?.total ?? 0}`}
          href="/tasks"
        />
        <StatCard
          icon={<Flame size={18} className="text-orange-400" />}
          label="Habits"
          value={habitsLoading ? null : `${habitsCompleted} / ${todayHabits?.length ?? 0}`}
          href="/habits"
        />
        <StatCard
          icon={<Moon size={18} className="text-indigo-400" />}
          label="Prayers"
          value={prayersLoading ? null : `${prayersDone} / ${prayers?.length ?? 0}`}
          href="/prayers"
        />
        <StatCard
          icon={<Timer size={18} className="text-teal-400" />}
          label="Focus today"
          value={focusLoading ? null : `${focusStats?.todayMinutes ?? 0} min`}
          href="/focus"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today's tasks */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Today's Tasks</h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : todayTasks?.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks for today</p>
          ) : (
            <div className="space-y-2">
              {todayTasks?.tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-1.5" data-testid={`task-item-${task.id}`}>
                  {task.status === "done"
                    ? <CheckCircle2 size={16} className="text-primary shrink-0" />
                    : <Circle size={16} className="text-muted-foreground shrink-0" />
                  }
                  <span className={`text-sm flex-1 truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </span>
                  {task.priority !== "none" && (
                    <PriorityBadge priority={task.priority} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's habits */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Habit Check-in</h2>
            <Link href="/habits" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {habitsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : todayHabits?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No habits yet</p>
          ) : (
            <div className="space-y-2">
              {todayHabits?.slice(0, 5).map((habit) => (
                <div key={habit.id} className="flex items-center gap-3 py-1.5" data-testid={`habit-item-${habit.id}`}>
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    habit.todayStatus === "completed" ? "bg-primary" :
                    habit.todayStatus === "skipped" ? "bg-yellow-500" :
                    habit.todayStatus === "missed" ? "bg-destructive" :
                    "bg-muted-foreground/30"
                  }`} />
                  <span className="text-sm flex-1 truncate">{habit.name}</span>
                  {habit.streak > 0 && (
                    <span className="text-xs text-orange-400 flex items-center gap-0.5">
                      <Flame size={11} />{habit.streak}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prayers */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Prayers</h2>
            <Link href="/prayers" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Update <ChevronRight size={12} />
            </Link>
          </div>
          {prayersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : prayers?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">No prayers set for today</p>
              <Link href="/prayers" className="text-xs text-primary hover:underline">Set up prayers</Link>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {prayers?.map((prayer) => (
                <div key={prayer.id} className="flex flex-col items-center gap-1" data-testid={`prayer-${prayer.name}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    prayer.status === "on_time" ? "bg-primary/20 text-primary" :
                    prayer.status === "late" ? "bg-yellow-500/20 text-yellow-400" :
                    prayer.status === "missed" ? "bg-destructive/20 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {prayer.name.charAt(0)}
                  </div>
                  <span className="text-xs text-muted-foreground truncate w-full text-center">{prayer.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Islamic Life snapshot */}
        <Link href="/islamic">
          <div className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer h-full" data-testid="islamic-snapshot">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Islamic Life</h2>
              <span className="text-xs text-primary flex items-center gap-0.5">
                Open <ChevronRight size={12} />
              </span>
            </div>

            <div className="space-y-3">
              {/* Deeds progress */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Star size={15} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Today's Deeds</p>
                  <p className="text-xs text-muted-foreground">
                    {deedsCompleted} of {deedsTotal} completed
                  </p>
                </div>
                {deedsTotal > 0 && (
                  <div className="text-right">
                    <span className="text-sm font-semibold text-primary">
                      {Math.round((deedsCompleted / deedsTotal) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Deed progress bar */}
              {deedsTotal > 0 && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((deedsCompleted / deedsTotal) * 100)}%` }}
                  />
                </div>
              )}

              {/* Quran progress */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                  <BookOpen size={15} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {quran ? (
                    <>
                      <p className="text-sm font-medium">Khatmah — Page {quran.currentPage}</p>
                      <p className="text-xs text-muted-foreground">
                        {quran.percentComplete}% complete · {quran.pagesLeft} pages left
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-muted-foreground">Khatmah not started</p>
                      <p className="text-xs text-muted-foreground">Tap to begin your reading journey</p>
                    </>
                  )}
                </div>
                {quran && (
                  <span className="text-sm font-semibold text-teal-400">{quran.percentComplete}%</span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Today's events */}
        <div className="bg-card border border-card-border rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Today's Events</h2>
            <Link href="/calendar" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Calendar <ChevronRight size={12} />
            </Link>
          </div>
          {eventsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No events today</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-2 border-l-2 border-primary/40 pl-3" data-testid={`event-${event.id}`}>
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.startTime), "HH:mm")}
                      {event.endTime && ` – ${format(new Date(event.endTime), "HH:mm")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | null; href: string }) {
  return (
    <Link href={href} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="bg-card border border-card-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {value === null ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <p className="text-xl font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>{value}</p>
        )}
      </div>
    </Link>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/15 text-red-400 border-red-500/20",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${colors[priority] ?? ""}`}>
      {priority}
    </span>
  );
}
