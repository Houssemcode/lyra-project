import { useState, useEffect } from "react";
import {
  useListPrayers,
  useUpdatePrayer,
  useSeedPrayers,
  getListPrayersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Clock, CheckCircle2, XCircle, Circle, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parse, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

const statusConfig = {
  pending: { label: "Pending", icon: Circle, color: "text-muted-foreground", bg: "bg-muted/30" },
  on_time: { label: "On Time", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/15" },
  late: { label: "Late", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  missed: { label: "Missed", icon: XCircle, color: "text-destructive", bg: "bg-destructive/15" },
};

function getNextPrayer(prayers: Array<{ name: string; status: string; scheduledTime?: string | null }>) {
  const now = new Date();
  for (const name of PRAYER_ORDER) {
    const p = prayers.find((x) => x.name === name);
    if (!p || p.status !== "pending" || !p.scheduledTime) continue;
    try {
      const [h, m] = p.scheduledTime.split(":").map(Number);
      const pTime = new Date();
      pTime.setHours(h!, m!, 0, 0);
      if (isAfter(pTime, now)) return { name, scheduledTime: p.scheduledTime, pTime };
    } catch { /* ignore */ }
  }
  return null;
}

function useCountdown(targetTime: Date | null) {
  const [remaining, setRemaining] = useState<string | null>(null);
  useEffect(() => {
    if (!targetTime) { setRemaining(null); return; }
    function update() {
      if (!targetTime) { setRemaining(null); return; }
      const diff = targetTime.getTime() - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTime]);
  return remaining;
}

export default function Prayers() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const queryClient = useQueryClient();

  const { data: prayers, isLoading } = useListPrayers({ date: selectedDate });
  const updatePrayer = useUpdatePrayer();
  const seedPrayers = useSeedPrayers();

  const isToday = selectedDate === today;
  const nextPrayer = isToday && prayers ? getNextPrayer(prayers) : null;
  const countdown = useCountdown(nextPrayer?.pTime ?? null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListPrayersQueryKey({ date: selectedDate }) });
    queryClient.invalidateQueries({ queryKey: getListPrayersQueryKey() });
  }

  function handleSeed() {
    seedPrayers.mutate({ data: { date: selectedDate } }, { onSuccess: invalidate });
  }

  function handleStatus(id: string, status: "pending" | "on_time" | "late" | "missed") {
    updatePrayer.mutate({ id, data: { status } }, { onSuccess: invalidate });
  }

  const onTimeCount = prayers?.filter((p) => p.status === "on_time").length ?? 0;
  const lateCount = prayers?.filter((p) => p.status === "late").length ?? 0;
  const missedCount = prayers?.filter((p) => p.status === "missed").length ?? 0;
  const pendingCount = prayers?.filter((p) => p.status === "pending").length ?? 0;
  const hasScheduledTimes = prayers?.some((p) => !!p.scheduledTime) ?? false;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <Moon size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Prayers</h1>
            <p className="text-sm text-muted-foreground">Daily prayer tracker</p>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm bg-card border border-card-border rounded-lg px-3 py-1.5 text-foreground"
          data-testid="input-prayer-date"
        />
      </div>

      {/* Next prayer countdown — only on today + has scheduled times */}
      {isToday && nextPrayer && countdown && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 flex items-center gap-4"
          data-testid="next-prayer-banner"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-indigo-400/80 font-medium uppercase tracking-wide">Next Prayer</p>
            <p className="font-semibold text-foreground">{nextPrayer.name}</p>
            {nextPrayer.scheduledTime && (
              <p className="text-xs text-muted-foreground">{nextPrayer.scheduledTime}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-indigo-400 tabular-nums" style={{ fontFamily: "var(--app-font-display)" }}>
              {countdown}
            </p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </motion.div>
      )}

      {/* No scheduled times nudge */}
      {isToday && prayers && prayers.length > 0 && !hasScheduledTimes && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 text-sm">
          <MapPin size={15} className="text-amber-400 shrink-0" />
          <span className="text-muted-foreground flex-1">Add prayer times to get a live countdown</span>
          <Link href="/islamic" className="text-xs text-amber-400 hover:underline">
            Calculate →
          </Link>
        </div>
      )}

      {/* Stats */}
      {prayers && prayers.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "On time", value: onTimeCount, color: "text-primary" },
            { label: "Late", value: lateCount, color: "text-yellow-400" },
            { label: "Missed", value: missedCount, color: "text-destructive" },
            { label: "Pending", value: pendingCount, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-card-border rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "var(--app-font-display)" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Prayer list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : prayers?.length === 0 ? (
        <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
          <Moon size={40} className="mx-auto mb-4 text-indigo-400/50" />
          <h2 className="font-semibold mb-1">No prayers set for this day</h2>
          <p className="text-sm text-muted-foreground mb-4">Set up the 5 daily prayers to start tracking</p>
          <Button onClick={handleSeed} disabled={seedPrayers.isPending} data-testid="button-seed-prayers">
            {seedPrayers.isPending ? "Setting up..." : "Set up Today's Prayers"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {PRAYER_ORDER.map((name) => {
            const prayer = prayers?.find((p) => p.name === name);
            if (!prayer) return null;
            const config = statusConfig[prayer.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const Icon = config.icon;
            const isNext = nextPrayer?.name === name;

            return (
              <motion.div
                key={prayer.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card border rounded-xl p-4 transition-colors ${
                  isNext ? "border-indigo-500/40 ring-1 ring-indigo-500/20" : "border-card-border"
                }`}
                data-testid={`prayer-item-${prayer.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                      <Icon size={18} className={config.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{prayer.name}</p>
                        {isNext && (
                          <span className="text-xs bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-full">Next</span>
                        )}
                      </div>
                      {prayer.scheduledTime ? (
                        <p className="text-xs text-muted-foreground">{prayer.scheduledTime}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50">No time set</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {(["on_time", "late", "missed", "pending"] as const).map((s) => {
                      const sc = statusConfig[s];
                      const SIcon = sc.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatus(prayer.id, s)}
                          className={`p-2 rounded-lg transition-colors ${prayer.status === s ? `${sc.bg} ${sc.color}` : "hover:bg-accent text-muted-foreground"}`}
                          title={sc.label}
                          data-testid={`button-prayer-${s}-${prayer.id}`}
                        >
                          <SIcon size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
