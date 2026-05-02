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
import { CheckCircle2, Circle, Flame, Moon, Timer, CalendarDays, ChevronRight, Star, BookOpen, Plus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const SI = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

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

  const statItems = [
    {
      icon: <CheckCircle2 size={18} className="text-primary" />,
      label: "Tasks done",
      value: tasksLoading ? null : `${todayTasks?.done ?? 0} / ${todayTasks?.total ?? 0}`,
      href: "/tasks",
    },
    {
      icon: <Flame size={18} className="text-orange-400" />,
      label: "Habits",
      value: habitsLoading ? null : `${habitsCompleted} / ${todayHabits?.length ?? 0}`,
      href: "/habits",
    },
    {
      icon: <Moon size={18} className="text-indigo-400" />,
      label: "Prayers",
      value: prayersLoading ? null : `${prayersDone} / ${prayers?.length ?? 0}`,
      href: "/prayers",
    },
    {
      icon: <Timer size={18} className="text-teal-400" />,
      label: "Focus today",
      value: focusLoading ? null : `${focusStats?.todayMinutes ?? 0} min`,
      href: "/focus",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        <div className="flex items-end justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold mt-0.5" style={{ fontFamily: "var(--app-font-display)" }}>
            {getGreeting()}
          </h1>
          <span className="text-xs text-muted-foreground/70 pb-0.5">{hijri}</span>
        </div>
      </motion.div>

      {/* Stats row — staggered */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={STAGGER}
        initial="hidden"
        animate="show"
      >
        {statItems.map((s) => (
          <motion.div key={s.label} variants={SI}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* Widget grid — staggered */}
      <motion.div
        className="grid lg:grid-cols-2 gap-4"
        variants={STAGGER}
        initial="hidden"
        animate="show"
      >
        {/* Today's tasks */}
        <motion.div variants={SI}>
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Today's Tasks</h2>
              <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {tasksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                  </div>
                ))}
              </div>
            ) : todayTasks?.tasks.length === 0 ? (
              <WidgetEmpty
                icon={<CheckCircle2 size={16} className="text-primary/40" />}
                bg="bg-primary/8"
                text="No tasks due today"
                linkHref="/tasks"
                linkLabel="Add a task"
              />
            ) : (
              <div className="space-y-1.5">
                {todayTasks?.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-1" data-testid={`task-item-${task.id}`}>
                    {task.status === "done"
                      ? <CheckCircle2 size={15} className="text-primary shrink-0" />
                      : <Circle size={15} className="text-muted-foreground/50 shrink-0" />
                    }
                    <span className={`text-sm flex-1 truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                    {task.priority !== "none" && <PriorityBadge priority={task.priority} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Today's habits */}
        <motion.div variants={SI}>
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Habit Check-in</h2>
              <Link href="/habits" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {habitsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                  </div>
                ))}
              </div>
            ) : todayHabits?.length === 0 ? (
              <WidgetEmpty
                icon={<Flame size={16} className="text-orange-400/50" />}
                bg="bg-orange-500/8"
                text="No habits set up yet"
                linkHref="/habits"
                linkLabel="Create habits"
              />
            ) : (
              <div className="space-y-1.5">
                {todayHabits?.slice(0, 5).map((habit) => (
                  <div key={habit.id} className="flex items-center gap-3 py-1" data-testid={`habit-item-${habit.id}`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      habit.todayStatus === "completed" ? "bg-primary" :
                      habit.todayStatus === "skipped" ? "bg-yellow-500" :
                      habit.todayStatus === "missed" ? "bg-destructive" :
                      "bg-muted-foreground/25"
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
        </motion.div>

        {/* Prayers */}
        <motion.div variants={SI}>
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Prayers</h2>
              <Link href="/prayers" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Update <ChevronRight size={12} />
              </Link>
            </div>
            {prayersLoading ? (
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-2 w-8" />
                  </div>
                ))}
              </div>
            ) : prayers?.length === 0 ? (
              <WidgetEmpty
                icon={<Moon size={16} className="text-indigo-400/50" />}
                bg="bg-indigo-500/8"
                text="Prayer times not set up"
                linkHref="/prayers"
                linkLabel="Set up prayers"
              />
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {prayers?.map((prayer) => (
                  <div key={prayer.id} className="flex flex-col items-center gap-1" data-testid={`prayer-${prayer.name}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
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
        </motion.div>

        {/* Islamic Life snapshot */}
        <motion.div variants={SI}>
          <Link href="/islamic">
            <div className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer h-full" data-testid="islamic-snapshot">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Islamic Life</h2>
                <span className="text-xs text-primary flex items-center gap-0.5">
                  Open <ChevronRight size={12} />
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Star size={15} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Today's Deeds</p>
                    <p className="text-xs text-muted-foreground">{deedsCompleted} of {deedsTotal} completed</p>
                  </div>
                  {deedsTotal > 0 && (
                    <span className="text-sm font-semibold text-primary">
                      {Math.round((deedsCompleted / deedsTotal) * 100)}%
                    </span>
                  )}
                </div>
                {deedsTotal > 0 && (
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="bg-primary h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((deedsCompleted / deedsTotal) * 100)}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                    <BookOpen size={15} className="text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {quran ? (
                      <>
                        <p className="text-sm font-medium">Khatmah — Page {quran.currentPage}</p>
                        <p className="text-xs text-muted-foreground">{quran.percentComplete}% · {quran.pagesLeft} pages left</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-muted-foreground">Khatmah not started</p>
                        <p className="text-xs text-muted-foreground">Tap to begin your reading journey</p>
                      </>
                    )}
                  </div>
                  {quran && <span className="text-sm font-semibold text-teal-400">{quran.percentComplete}%</span>}
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Today's events */}
        <motion.div variants={SI} className="lg:col-span-2">
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Today's Events</h2>
              <Link href="/calendar" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Calendar <ChevronRight size={12} />
              </Link>
            </div>
            {eventsLoading ? (
              <div className="flex gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex-1 space-y-1.5 border-l-2 border-muted pl-3">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : todayEvents.length === 0 ? (
              <WidgetEmpty
                icon={<CalendarDays size={16} className="text-muted-foreground/40" />}
                bg="bg-muted/20"
                text="Free day — no events scheduled"
                linkHref="/calendar"
                linkLabel="Add an event"
              />
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
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Widget compact empty state ─────────────────────────────────────────────────
function WidgetEmpty({ icon, bg, text, linkHref, linkLabel }: {
  icon: React.ReactNode; bg: string; text: string; linkHref: string; linkLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-5 text-center">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href={linkHref} className="text-xs text-primary hover:underline flex items-center gap-0.5">
        <Plus size={10} />{linkLabel}
      </Link>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | null; href: string }) {
  return (
    <Link href={href} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="bg-card border border-card-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer group">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">{label}</span>
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

// ── Priority badge ────────────────────────────────────────────────────────────
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
