import { useState } from "react";
import {
  useListPrayers,
  useUpdatePrayer,
  useSeedPrayers,
  getListPrayersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Clock, CheckCircle2, AlertCircle, XCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

const statusConfig = {
  pending: { label: "Pending", icon: Circle, color: "text-muted-foreground", bg: "bg-muted/30" },
  on_time: { label: "On Time", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/15" },
  late: { label: "Late", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  missed: { label: "Missed", icon: XCircle, color: "text-destructive", bg: "bg-destructive/15" },
};

export default function Prayers() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const queryClient = useQueryClient();

  const { data: prayers, isLoading } = useListPrayers({ date: selectedDate });
  const updatePrayer = useUpdatePrayer();
  const seedPrayers = useSeedPrayers();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListPrayersQueryKey({ date: selectedDate }) });
    queryClient.invalidateQueries({ queryKey: getListPrayersQueryKey() });
  }

  function handleSeed() {
    seedPrayers.mutate({ data: { date: selectedDate } }, { onSuccess: invalidate });
  }

  function handleStatus(id: string, status: "pending" | "on_time" | "late" | "missed") {
    updatePrayer.mutate(
      { id, data: { status } },
      { onSuccess: invalidate }
    );
  }

  const onTimeCount = prayers?.filter((p) => p.status === "on_time").length ?? 0;
  const lateCount = prayers?.filter((p) => p.status === "late").length ?? 0;
  const missedCount = prayers?.filter((p) => p.status === "missed").length ?? 0;
  const pendingCount = prayers?.filter((p) => p.status === "pending").length ?? 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
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

            return (
              <motion.div
                key={prayer.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-card-border rounded-xl p-4"
                data-testid={`prayer-item-${prayer.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                      <Icon size={18} className={config.color} />
                    </div>
                    <div>
                      <p className="font-semibold">{prayer.name}</p>
                      {prayer.scheduledTime && (
                        <p className="text-xs text-muted-foreground">{prayer.scheduledTime}</p>
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

      {selectedDate === today && prayers && prayers.length === 0 && (
        <div />
      )}
    </div>
  );
}
