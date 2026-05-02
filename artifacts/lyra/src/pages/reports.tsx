import { useState } from "react";
import { useGetReport } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Flame,
  Moon,
  Timer,
  BookOpen,
  Zap,
  Trophy,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addWeeks, addMonths, subWeeks, subMonths, startOfWeek, startOfMonth } from "date-fns";

type Period = "weekly" | "monthly";

const TEAL = "hsl(186 60% 45%)";
const TEAL_LIGHT = "hsl(186 60% 55%)";
const AMBER = "hsl(38 92% 50%)";
const MUTED = "hsl(226 15% 25%)";

function fmt(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function dayLabel(date: string, period: Period): string {
  const d = new Date(date + "T00:00:00");
  return period === "weekly"
    ? format(d, "EEE")
    : format(d, "d");
}

const tooltipStyle = {
  backgroundColor: "hsl(226 30% 10%)",
  border: "1px solid hsl(226 15% 20%)",
  borderRadius: 8,
  color: "hsl(210 20% 90%)",
  fontSize: 12,
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function PrayerPillBar({ onTime, late, missed }: { onTime: number; late: number; missed: number }) {
  const total = onTime + late + missed;
  if (total === 0) return <span className="text-xs text-muted-foreground">No data</span>;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
        <span className="text-xs text-muted-foreground">{onTime} on time</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
        <span className="text-xs text-muted-foreground">{late} late</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-destructive inline-block" />
        <span className="text-xs text-muted-foreground">{missed} missed</span>
      </div>
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [anchor, setAnchor] = useState<Date>(new Date());

  const anchorStr = fmt(anchor);

  const { data, isLoading } = useGetReport({ period, date: anchorStr });

  function navigate(dir: -1 | 1) {
    if (period === "weekly") {
      setAnchor((a) => (dir === 1 ? addWeeks(a, 1) : subWeeks(a, 1)));
    } else {
      setAnchor((a) => (dir === 1 ? addMonths(a, 1) : subMonths(a, 1)));
    }
  }

  function goToday() {
    setAnchor(new Date());
  }

  const isCurrentPeriod =
    period === "weekly"
      ? fmt(startOfWeek(new Date(), { weekStartsOn: 1 })) ===
        fmt(startOfWeek(anchor, { weekStartsOn: 1 }))
      : fmt(startOfMonth(new Date())) === fmt(startOfMonth(anchor));

  const periodLabel = data
    ? period === "weekly"
      ? `${format(new Date(data.startDate + "T00:00:00"), "MMM d")} – ${format(new Date(data.endDate + "T00:00:00"), "MMM d, yyyy")}`
      : format(new Date(data.startDate + "T00:00:00"), "MMMM yyyy")
    : "…";

  const chartData = (data?.days ?? []).map((d) => ({
    label: dayLabel(d.date, period),
    date: d.date,
    tasks: d.tasksCompleted,
    habits: d.habitsCompleted,
    focus: d.focusMinutes,
    xp: d.xp,
    prayersOnTime: d.prayersOnTime,
    prayersLate: d.prayersLate,
    prayersMissed: d.prayersMissed,
    deeds: d.deedsCompleted,
  }));

  const totalPrayers =
    (data?.totalPrayersOnTime ?? 0) + (data?.totalPrayersLate ?? 0) + (data?.totalPrayersMissed ?? 0);
  const prayerRate =
    totalPrayers > 0
      ? Math.round(((data?.totalPrayersOnTime ?? 0) / totalPrayers) * 100)
      : 0;

  const focusHours = data ? (data.totalFocusMinutes / 60).toFixed(1) : "0";
  const avgHabitRate = data?.avgHabitRate ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText size={22} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>
              Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your productivity at a glance
            </p>
          </div>
        </div>

        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {(["weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setAnchor(new Date()); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                period === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold flex-1 text-center">{periodLabel}</span>
        <button
          onClick={() => navigate(1)}
          disabled={isCurrentPeriod}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={18} />
        </button>
        {!isCurrentPeriod && (
          <button
            onClick={goToday}
            className="text-xs text-primary hover:underline px-1"
          >
            Today
          </button>
        )}
      </div>

      {/* Summary stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard
            icon={Trophy}
            label="Total XP"
            value={data?.totalXp.toLocaleString() ?? 0}
            sub={period === "weekly" ? "this week" : "this month"}
            color="text-primary"
            bg="bg-primary/10"
          />
          <StatCard
            icon={CheckSquare}
            label="Tasks Done"
            value={data?.totalTasksCompleted ?? 0}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <StatCard
            icon={Flame}
            label="Habit Rate"
            value={`${avgHabitRate}%`}
            sub={`${data?.totalHabitsCompleted ?? 0} completions`}
            color="text-orange-400"
            bg="bg-orange-500/10"
          />
          <StatCard
            icon={Moon}
            label="Prayers On Time"
            value={`${prayerRate}%`}
            sub={`${data?.totalPrayersOnTime ?? 0} of ${totalPrayers}`}
            color="text-indigo-400"
            bg="bg-indigo-500/10"
          />
          <StatCard
            icon={Timer}
            label="Focus Time"
            value={`${focusHours}h`}
            sub={`${data?.totalFocusMinutes ?? 0} minutes`}
            color="text-cyan-400"
            bg="bg-cyan-500/10"
          />
          <StatCard
            icon={BookOpen}
            label="Islamic Deeds"
            value={data?.totalDeedsCompleted ?? 0}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
        </div>
      )}

      {/* XP Chart */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-primary" />
          <h2 className="text-sm font-semibold">XP Earned</h2>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={period === "monthly" ? 6 : 18}>
              <CartesianGrid vertical={false} stroke={MUTED} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(210 15% 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={period === "monthly" ? 4 : 0}
              />
              <YAxis
                tick={{ fill: "hsl(210 15% 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "hsl(226 20% 15%)" }}
                formatter={(v: number) => [`${v} XP`, "XP"]}
              />
              <Bar dataKey="xp" fill={TEAL} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Habits + Focus side-by-side */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Habits per day */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={14} className="text-orange-400" />
            <h2 className="text-sm font-semibold">Habits Completed / Day</h2>
          </div>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barSize={period === "monthly" ? 5 : 16}>
                <CartesianGrid vertical={false} stroke={MUTED} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === "monthly" ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "hsl(226 20% 15%)" }}
                  formatter={(v: number) => [v, "completed"]}
                />
                <Bar dataKey="habits" fill="hsl(38 92% 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Focus per day */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Timer size={14} className="text-cyan-400" />
            <h2 className="text-sm font-semibold">Focus Minutes / Day</h2>
          </div>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barSize={period === "monthly" ? 5 : 16}>
                <CartesianGrid vertical={false} stroke={MUTED} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === "monthly" ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "hsl(226 20% 15%)" }}
                  formatter={(v: number) => [`${v} min`, "Focus"]}
                />
                <Bar dataKey="focus" fill="hsl(186 70% 40%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Prayers chart */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Moon size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold">Prayers by Day</h2>
          </div>
          <PrayerPillBar
            onTime={data?.totalPrayersOnTime ?? 0}
            late={data?.totalPrayersLate ?? 0}
            missed={data?.totalPrayersMissed ?? 0}
          />
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={period === "monthly" ? 5 : 16}>
              <CartesianGrid vertical={false} stroke={MUTED} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(210 15% 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={period === "monthly" ? 4 : 0}
              />
              <YAxis
                tick={{ fill: "hsl(210 15% 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "hsl(226 20% 15%)" }}
              />
              <Bar dataKey="prayersOnTime" name="On Time" stackId="p" fill={TEAL} />
              <Bar dataKey="prayersLate" name="Late" stackId="p" fill={AMBER} />
              <Bar dataKey="prayersMissed" name="Missed" stackId="p" fill="hsl(0 70% 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tasks + Deeds line charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={14} className="text-blue-400" />
            <h2 className="text-sm font-semibold">Tasks Completed / Day</h2>
          </div>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke={MUTED} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === "monthly" ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: "hsl(226 20% 25%)" }}
                  formatter={(v: number) => [v, "tasks"]}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold">Islamic Deeds / Day</h2>
          </div>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke={MUTED} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === "monthly" ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: "hsl(210 15% 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: "hsl(226 20% 25%)" }}
                  formatter={(v: number) => [v, "deeds"]}
                />
                <Line
                  type="monotone"
                  dataKey="deeds"
                  stroke="hsl(152 69% 45%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Habit breakdown table */}
      {(data?.habitBreakdown?.length ?? 0) > 0 && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border">
            <Flame size={14} className="text-orange-400" />
            <h2 className="text-sm font-semibold">Habit Breakdown</h2>
          </div>
          {data?.habitBreakdown.map((h, i) => {
            const rate = h.totalDays > 0 ? Math.round((h.completedDays / h.totalDays) * 100) : 0;
            return (
              <div
                key={h.habitId}
                className={`flex items-center gap-3 px-4 py-2.5 ${i < (data.habitBreakdown.length - 1) ? "border-b border-card-border" : ""}`}
              >
                <p className="text-sm flex-1 truncate">{h.name}</p>
                <div className="w-24 hidden sm:flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {h.completedDays}/{h.totalDays} days
                </span>
                <span className={`text-xs font-semibold w-10 text-right ${rate >= 70 ? "text-primary" : rate >= 40 ? "text-amber-400" : "text-destructive"}`}>
                  {rate}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
