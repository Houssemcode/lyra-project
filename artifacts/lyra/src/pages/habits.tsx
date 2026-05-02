import { useEffect, useState } from "react";
import {
  useGetTodayHabits,
  useListHabits,
  useCreateHabit,
  useLogHabit,
  useDeleteHabit,
  getGetTodayHabitsQueryKey,
  getListHabitsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Flame, Check, SkipForward, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const habitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]).default("anytime"),
  type: z.enum(["positive", "negative"]).default("positive"),
});
type HabitFormValues = z.infer<typeof habitSchema>;

const timeOfDayOrder = ["morning", "afternoon", "evening", "anytime"];
const timeOfDayLabel: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

export default function Habits() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: todayHabits, isLoading } = useGetTodayHabits();
  const createHabit = useCreateHabit();
  const logHabit = useLogHabit();
  const deleteHabit = useDeleteHabit();

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: { name: "", timeOfDay: "anytime", type: "positive" },
  });

  // Seed defaults if empty
  useEffect(() => {
    if (todayHabits && todayHabits.length === 0) {
      const defaults = [
        { name: "Morning Reading", category: "Mindfulness", timeOfDay: "morning" as const, type: "positive" as const },
        { name: "Evening Walk", category: "Health", timeOfDay: "evening" as const, type: "positive" as const },
        { name: "Drink 8 Glasses Water", category: "Health", timeOfDay: "anytime" as const, type: "positive" as const },
      ];
      defaults.forEach((d) => createHabit.mutate({ data: d }, { onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
      }}));
    }
  }, [todayHabits]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
  }

  function onLog(habitId: string, status: "completed" | "skipped" | "missed") {
    logHabit.mutate(
      { id: habitId, data: { date: today, status } },
      { onSuccess: invalidate }
    );
  }

  function onDelete(habitId: string) {
    deleteHabit.mutate({ id: habitId }, { onSuccess: invalidate });
  }

  function onSubmit(values: HabitFormValues) {
    createHabit.mutate(
      { data: { name: values.name, category: values.category ?? null, timeOfDay: values.timeOfDay, type: values.type } },
      {
        onSuccess: () => {
          invalidate();
          form.reset();
          setShowDialog(false);
        },
      }
    );
  }

  // Group by timeOfDay
  const grouped = timeOfDayOrder.reduce<Record<string, typeof todayHabits>>((acc, tod) => {
    acc[tod] = todayHabits?.filter((h) => h.timeOfDay === tod) ?? [];
    return acc;
  }, {});

  const totalCompleted = todayHabits?.filter((h) => h.todayStatus === "completed").length ?? 0;
  const total = todayHabits?.length ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Habits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalCompleted} of {total} completed today</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-habit" size="sm">
          <Plus size={15} className="mr-1.5" /> Add Habit
        </Button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(totalCompleted / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-card border border-card-border rounded-xl">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {timeOfDayOrder.map((tod) => {
            const habits = grouped[tod];
            if (!habits || habits.length === 0) return null;
            return (
              <div key={tod}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{timeOfDayLabel[tod]}</h2>
                <AnimatePresence>
                  <div className="space-y-2">
                    {habits.map((habit) => (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 bg-card border border-card-border rounded-xl px-4 py-3 group"
                        data-testid={`habit-item-${habit.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{habit.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {habit.category && (
                              <span className="text-xs text-muted-foreground">{habit.category}</span>
                            )}
                            {habit.streak > 0 && (
                              <span className="text-xs text-orange-400 flex items-center gap-0.5">
                                <Flame size={10} /> {habit.streak} day streak
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status indicator */}
                        <StatusBadge status={habit.todayStatus} />

                        {/* Action buttons */}
                        <div className="flex gap-1">
                          <button
                            className={`p-1.5 rounded-lg transition-colors ${habit.todayStatus === "completed" ? "bg-primary/20 text-primary" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"}`}
                            onClick={() => onLog(habit.id, "completed")}
                            data-testid={`button-complete-habit-${habit.id}`}
                            title="Mark complete"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className={`p-1.5 rounded-lg transition-colors ${habit.todayStatus === "skipped" ? "bg-yellow-500/20 text-yellow-400" : "hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400"}`}
                            onClick={() => onLog(habit.id, "skipped")}
                            data-testid={`button-skip-habit-${habit.id}`}
                            title="Skip"
                          >
                            <SkipForward size={14} />
                          </button>
                          <button
                            className={`p-1.5 rounded-lg transition-colors ${habit.todayStatus === "missed" ? "bg-destructive/20 text-destructive" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}
                            onClick={() => onLog(habit.id, "missed")}
                            data-testid={`button-miss-habit-${habit.id}`}
                            title="Mark missed"
                          >
                            <X size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(habit.id)}
                            data-testid={`button-delete-habit-${habit.id}`}
                            title="Delete habit"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g. Morning meditation" {...form.register("name")} data-testid="input-habit-name" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label>Category</Label>
              <Input placeholder="e.g. Health, Work" {...form.register("category")} data-testid="input-habit-category" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Time of day</Label>
                <Select value={form.watch("timeOfDay")} onValueChange={(v) => form.setValue("timeOfDay", v as any)}>
                  <SelectTrigger data-testid="select-habit-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="anytime">Anytime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as any)}>
                  <SelectTrigger data-testid="select-habit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive (build)</SelectItem>
                    <SelectItem value="negative">Negative (quit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createHabit.isPending} data-testid="button-submit-habit">
                {createHabit.isPending ? "Creating..." : "Create Habit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">pending</span>;
  const styles: Record<string, string> = {
    completed: "bg-primary/15 text-primary",
    skipped: "bg-yellow-500/15 text-yellow-400",
    missed: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] ?? ""}`}>{status}</span>;
}
