import { useGetGamificationSummary } from "@workspace/api-client-react";
import { Trophy, Flame, Target, Zap, Moon, BookOpen, Timer, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const LEVEL_NAMES: Record<number, string> = {
  1: "Seeker",
  2: "Strider",
  3: "Devotee",
  4: "Steadfast",
  5: "Luminous",
  6: "Ascendant",
  7: "Radiant",
  8: "Illumined",
  9: "Exalted",
  10: "Transcendent",
};

function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level, 10)] ?? `Level ${level}`;
}

function getLevelColor(level: number): string {
  if (level <= 2) return "from-slate-400 to-slate-500";
  if (level <= 4) return "from-emerald-400 to-teal-500";
  if (level <= 6) return "from-cyan-400 to-blue-500";
  if (level <= 8) return "from-violet-400 to-purple-500";
  return "from-amber-400 to-orange-500";
}

const CATEGORY_CONFIG = [
  {
    key: "tasks" as const,
    label: "Tasks",
    icon: CheckSquare,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    xpPer: "10 XP per task",
  },
  {
    key: "habits" as const,
    label: "Habits",
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    xpPer: "15 XP per habit",
  },
  {
    key: "prayers" as const,
    label: "Prayers",
    icon: Moon,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    xpPer: "20 on-time / 8 late",
  },
  {
    key: "focus" as const,
    label: "Focus",
    icon: Timer,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    xpPer: "1 XP per minute",
  },
  {
    key: "islamic" as const,
    label: "Islamic Deeds",
    icon: BookOpen,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    xpPer: "12 XP per deed",
  },
];

export default function Progress() {
  const { data, isLoading } = useGetGamificationSummary();

  const level = data?.level ?? 1;
  const totalXp = data?.totalXp ?? 0;
  const currentLevelXp = data?.currentLevelXp ?? 0;
  const nextLevelXp = data?.nextLevelXp ?? 200;
  const weeklyXp = data?.weeklyXp ?? 0;
  const todayScore = data?.todayScore;
  const habitStreaks = data?.habitStreaks ?? [];
  const progressPct = nextLevelXp > 0 ? (currentLevelXp / nextLevelXp) * 100 : 0;

  const topStreaks = [...habitStreaks]
    .filter((h) => h.streak > 0 || h.bestStreak > 0)
    .sort((a, b) => b.streak - a.streak);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy size={22} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>
            Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">XP, levels, and streaks</p>
        </div>
      </div>

      {/* Level Card */}
      {isLoading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card p-6">
          <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-primary to-transparent pointer-events-none" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-5xl font-extrabold bg-gradient-to-r ${getLevelColor(level)} bg-clip-text text-transparent`}
                  style={{ fontFamily: "var(--app-font-display)" }}
                >
                  {level}
                </span>
                <span className="text-lg font-semibold text-muted-foreground">
                  {getLevelName(level)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentLevelXp} / {nextLevelXp} XP to next level
              </p>

              {/* XP progress bar */}
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-foreground">{totalXp.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total XP</p>
              <div className="mt-2 text-right">
                <p className="text-sm font-semibold text-primary">{weeklyXp}</p>
                <p className="text-xs text-muted-foreground">this week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Score */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Zap size={12} /> Today's XP
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORY_CONFIG.map(({ key, label, icon: Icon, color, bg, xpPer }) => {
              const xp = todayScore?.[key] ?? 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border border-card-border bg-card px-4 py-3 flex flex-col gap-1 ${xp > 0 ? "border-primary/20" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon size={14} className={color} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <p className={`text-lg font-bold ${xp > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {xp} <span className="text-xs font-normal text-muted-foreground">XP</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">{xpPer}</p>
                </motion.div>
              );
            })}

            {/* Total card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-col gap-1"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Trophy size={14} className="text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Total Today</p>
              <p className="text-lg font-bold text-primary">
                {todayScore?.total ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">XP</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60">all categories</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Habit Streaks */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Flame size={12} /> Habit Streaks
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : topStreaks.length === 0 ? (
          <div className="rounded-xl border border-card-border bg-card p-5 text-center text-sm text-muted-foreground">
            Log habits to build streaks
          </div>
        ) : (
          <div className="space-y-2">
            {topStreaks.map((h, idx) => (
              <motion.div
                key={h.habitId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 bg-card border border-card-border rounded-xl px-4 py-3"
              >
                {/* Rank */}
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.name}</p>
                  {h.bestStreak > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Best: {h.bestStreak} day{h.bestStreak !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Current streak badge */}
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  h.streak >= 7
                    ? "bg-orange-500/20 text-orange-400"
                    : h.streak >= 3
                    ? "bg-amber-500/20 text-amber-400"
                    : h.streak > 0
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Flame size={11} />
                  {h.streak}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* XP Guide */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Target size={12} /> How to Earn XP
        </h2>
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          {[
            { label: "Complete a task", xp: "+10 XP" },
            { label: "Complete a habit", xp: "+15 XP" },
            { label: "Prayer on time", xp: "+20 XP" },
            { label: "Prayer late", xp: "+8 XP" },
            { label: "Focus session (per minute, max 90)", xp: "+1 XP" },
            { label: "Islamic deed", xp: "+12 XP" },
            { label: "Level up every", xp: "200 XP" },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                i < arr.length - 1 ? "border-b border-card-border" : ""
              }`}
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-primary text-xs">{row.xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
