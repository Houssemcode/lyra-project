import { useState } from "react";
import { useGetDailySummary, getGetDailySummaryQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, Flame, Moon, Timer, CalendarDays, BarChart3, RefreshCw, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function Summary() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useGetDailySummary({ date: selectedDate });

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey({ date: selectedDate }) });
    refetch();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <BarChart3 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Daily Summary</h1>
            <p className="text-sm text-muted-foreground">Your day at a glance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm bg-card border border-card-border rounded-lg px-3 py-1.5 text-foreground"
            data-testid="input-summary-date"
          />
          <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh-summary">
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-muted-foreground">No data for this day</div>
      ) : (
        <div className="space-y-4">
          {/* Tasks card */}
          <SummaryCard
            icon={<CheckCircle2 size={18} className="text-primary" />}
            title="Tasks"
            accent="primary"
          >
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Total" value={data.tasks.total} />
              <Metric label="Done" value={data.tasks.done} highlight />
              <Metric label="Pending" value={data.tasks.pending} />
            </div>
            {data.tasks.completedTitles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Completed</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.tasks.completedTitles.map((t, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </SummaryCard>

          {/* Habits card */}
          <SummaryCard
            icon={<Flame size={18} className="text-orange-400" />}
            title="Habits"
            accent="orange"
          >
            <div className="grid grid-cols-4 gap-3">
              <Metric label="Total" value={data.habits.total} />
              <Metric label="Done" value={data.habits.completed} highlight />
              <Metric label="Skipped" value={data.habits.skipped} />
              <Metric label="Missed" value={data.habits.missed} />
            </div>
            {data.habits.completedNames.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Completed habits</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.habits.completedNames.map((n, i) => (
                    <span key={i} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">{n}</span>
                  ))}
                </div>
              </div>
            )}
          </SummaryCard>

          {/* Prayers card */}
          <SummaryCard
            icon={<Moon size={18} className="text-indigo-400" />}
            title="Prayers"
            accent="indigo"
          >
            <div className="grid grid-cols-4 gap-3">
              <Metric label="On time" value={data.prayers.onTime} highlight />
              <Metric label="Late" value={data.prayers.late} />
              <Metric label="Missed" value={data.prayers.missed} />
              <Metric label="Pending" value={data.prayers.pending} />
            </div>
          </SummaryCard>

          {/* Focus card */}
          <SummaryCard
            icon={<Timer size={18} className="text-teal-400" />}
            title="Focus"
            accent="teal"
          >
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Total minutes" value={data.focus.totalMinutes} highlight />
              <Metric label="Sessions" value={data.focus.totalSessions} />
              <Metric label="Completed" value={data.focus.completedSessions} />
            </div>
            {data.focus.totalMinutes > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {Math.floor(data.focus.totalMinutes / 60)}h {data.focus.totalMinutes % 60}m of deep work logged
                </p>
              </div>
            )}
          </SummaryCard>

          {/* Islamic card */}
          <SummaryCard
            icon={<Star size={18} className="text-amber-400" />}
            title="Islamic Life"
            accent="amber"
          >
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Deeds completed" value={data.islamic.deedsCompleted} highlight />
              <Metric label="Deeds available" value={data.islamic.deedsTotal} />
            </div>
            {data.islamic.completedDeedNames.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Completed deeds</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.islamic.completedDeedNames.map((n, i) => (
                    <span key={i} className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{n}</span>
                  ))}
                </div>
              </div>
            )}
            {(data.islamic.quranPage !== null && data.islamic.quranPage !== undefined) && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                <BookOpen size={14} className="text-teal-400 shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">
                  Khatmah at page {data.islamic.quranPage}
                  {data.islamic.quranPercent !== null && ` · ${data.islamic.quranPercent}% complete`}
                </span>
              </div>
            )}
          </SummaryCard>

          {/* Events card */}
          {data.events.length > 0 && (
            <SummaryCard
              icon={<CalendarDays size={18} className="text-blue-400" />}
              title="Events"
              accent="blue"
            >
              <div className="space-y-1.5">
                {data.events.map((event) => (
                  <div key={event.id} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="flex-1 truncate">{event.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(event.startTime), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </SummaryCard>
          )}

          {/* API JSON export hint */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-mono">
              GET /api/daily-summary?date={selectedDate}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This endpoint powers your n8n automation pipeline and Telegram AI summary.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, title, accent, children }: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-card-border rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`} style={{ fontFamily: "var(--app-font-display)" }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
