import { useState } from "react";
import {
  useListTasks,
  useListRecurringTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  getListRecurringTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, CheckCircle2, Circle, Trash2, RefreshCw,
  CalendarDays, Repeat, Repeat2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";

const LIST_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const LIST_ITEM = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
};

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  dueDate: z.string().optional(),
  list: z.string().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
});
type TaskFormValues = z.infer<typeof taskSchema>;

const priorityColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
  none: "text-muted-foreground",
};

const recurrenceLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const recurrenceColors: Record<string, string> = {
  daily: "bg-teal-500/10 text-teal-400",
  weekly: "bg-blue-500/10 text-blue-400",
  monthly: "bg-purple-500/10 text-purple-400",
};

type TabValue = "tasks" | "recurring";

export default function Tasks() {
  const [tab, setTab] = useState<TabValue>("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const params = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  };

  const { data: tasks, isLoading } = useListTasks(params);
  const { data: recurringTasks, isLoading: recurringLoading } = useListRecurringTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", priority: "none", recurrence: "none" },
  });

  const watchedRecurrence = form.watch("recurrence");
  const isRecurring = watchedRecurrence !== "none";

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
    queryClient.invalidateQueries({ queryKey: getListRecurringTasksQueryKey() });
  }

  function onSubmit(values: TaskFormValues) {
    createTask.mutate(
      {
        data: {
          title: values.title,
          description: values.description ?? null,
          priority: values.priority,
          dueDate: values.dueDate ?? null,
          list: values.list ?? null,
          recurrence: values.recurrence,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          form.reset();
          setShowDialog(false);
          if (values.recurrence !== "none") setTab("recurring");
        },
      }
    );
  }

  function toggleStatus(id: string, current: string) {
    updateTask.mutate(
      { id, data: { status: current === "done" ? "pending" : "done" } },
      { onSuccess: invalidate }
    );
  }

  function handleDelete(id: string) {
    deleteTask.mutate({ id }, { onSuccess: () => { invalidate(); setDeleteConfirmId(null); } });
  }

  const pendingCount = tasks?.filter((t) => t.status === "pending").length ?? 0;
  const recurringCount = recurringTasks?.length ?? 0;
  const hasFilters = statusFilter !== "all" || priorityFilter !== "all";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tab === "tasks"
              ? `${pendingCount} pending`
              : `${recurringCount} recurring template${recurringCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-task" size="sm">
          <Plus size={15} className="mr-1.5" /> Add Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("tasks")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            tab === "tasks"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setTab("recurring")}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            tab === "recurring"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Repeat size={13} />
          Recurring
          {recurringCount > 0 && (
            <span className="text-xs bg-primary/15 text-primary px-1.5 rounded-full">{recurringCount}</span>
          )}
        </button>
      </div>

      {/* ── ALL TASKS TAB ── */}
      {tab === "tasks" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36 h-8 text-sm" data-testid="select-priority-filter">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-card border border-card-border rounded-xl">
                  <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          ) : tasks?.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={24} />}
              title={hasFilters ? "No tasks match these filters" : "No tasks yet"}
              description={
                hasFilters
                  ? "Try clearing the filters above to see all your tasks"
                  : "Ready to get things done? Add your first task."
              }
              action={
                !hasFilters
                  ? { label: "Add a task", onClick: () => setShowDialog(true) }
                  : undefined
              }
            />
          ) : (
            <motion.div
              className="space-y-2"
              variants={LIST_CONTAINER}
              initial="hidden"
              animate="show"
            >
              {tasks?.map((task) => (
                <motion.div key={task.id} variants={LIST_ITEM}>
                  <TaskCard
                    task={task}
                    onToggle={() => toggleStatus(task.id, task.status)}
                    onDelete={() => setDeleteConfirmId(task.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* ── RECURRING TAB ── */}
      {tab === "recurring" && (
        <div className="space-y-3">
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-400 leading-relaxed">
              Recurring tasks auto-generate a new instance each day / week / month. The template stays here; completed instances appear in All Tasks on their due date.
            </p>
          </div>

          {recurringLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-card border border-card-border rounded-xl">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recurringTasks?.length === 0 ? (
            <EmptyState
              icon={<Repeat2 size={24} />}
              title="No recurring tasks yet"
              description="Create a task and set its recurrence to daily, weekly, or monthly"
              action={{ label: "Create a recurring task", onClick: () => setShowDialog(true) }}
            />
          ) : (
            <motion.div
              className="space-y-2"
              variants={LIST_CONTAINER}
              initial="hidden"
              animate="show"
            >
              {recurringTasks?.map((task) => (
                <motion.div key={task.id} variants={LIST_ITEM}>
                  <RecurringCard task={task} onDelete={() => setDeleteConfirmId(task.id)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {tab === "recurring"
              ? "This will delete the recurring template. Already-generated instances for today will remain."
              : "This action cannot be undone."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteTask.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add task dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) form.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Task title" {...form.register("title")} data-testid="input-task-title" />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Optional notes..." {...form.register("description")} data-testid="input-task-description" />
            </div>

            <div>
              <Label>Recurrence</Label>
              <Select
                value={form.watch("recurrence")}
                onValueChange={(v) => form.setValue("recurrence", v as TaskFormValues["recurrence"])}
              >
                <SelectTrigger data-testid="select-task-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {isRecurring && (
                <p className="text-xs text-muted-foreground mt-1">
                  {watchedRecurrence === "daily" && "A new instance will be created every day."}
                  {watchedRecurrence === "weekly" && "Repeats weekly on the same day as the start date."}
                  {watchedRecurrence === "monthly" && "Repeats monthly on the same day as the start date."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.watch("priority")}
                  onValueChange={(v) => form.setValue("priority", v as "none" | "low" | "medium" | "high")}
                >
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">{isRecurring ? "Start Date" : "Due Date"}</Label>
                <Input id="dueDate" type="date" {...form.register("dueDate")} data-testid="input-task-due-date" />
                {isRecurring && (
                  <p className="text-xs text-muted-foreground mt-0.5">Optional — defaults to today</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="list">List</Label>
              <Input id="list" placeholder="e.g. Work, Personal" {...form.register("list")} data-testid="input-task-list" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); form.reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending} data-testid="button-submit-task">
                {createTask.isPending ? "Creating..." : isRecurring ? "Create Recurring Task" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: { id: string; title: string; description?: string | null; status: string; priority: string; dueDate?: string | null; list?: string | null; tags: string[]; templateId?: string | null; recurrence: string };
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isFromTemplate = !!task.templateId;
  return (
    <div
      className="flex items-start gap-3 bg-card border border-card-border rounded-xl px-4 py-3 group hover:border-primary/20 transition-colors"
      data-testid={`task-item-${task.id}`}
    >
      <button
        className="mt-0.5 shrink-0 transition-transform active:scale-90"
        onClick={onToggle}
        data-testid={`button-toggle-task-${task.id}`}
      >
        {task.status === "done"
          ? <CheckCircle2 size={18} className="text-primary" />
          : <Circle size={18} className="text-muted-foreground hover:text-primary transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
        )}
        <div className="flex gap-2 mt-1 flex-wrap items-center">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays size={11} />{task.dueDate}
            </span>
          )}
          {task.priority !== "none" && (
            <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
          )}
          {task.list && (
            <span className="text-xs bg-accent text-accent-foreground px-1.5 rounded">{task.list}</span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 rounded">#{tag}</span>
          ))}
          {isFromTemplate && (
            <span className="flex items-center gap-1 text-xs text-teal-400/70">
              <RefreshCw size={10} /> recurring
            </span>
          )}
        </div>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
        onClick={onDelete}
        data-testid={`button-delete-task-${task.id}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Recurring template card ──────────────────────────────────────────────────
function RecurringCard({
  task,
  onDelete,
}: {
  task: { id: string; title: string; description?: string | null; priority: string; dueDate?: string | null; list?: string | null; tags: string[]; recurrence: string };
  onDelete: () => void;
}) {
  const freq = task.recurrence as keyof typeof recurrenceLabels;
  return (
    <div className="flex items-start gap-3 bg-card border border-card-border rounded-xl px-4 py-3.5 group hover:border-primary/20 transition-colors">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
        <Repeat size={15} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
        )}
        <div className="flex gap-2 mt-1.5 flex-wrap items-center">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${recurrenceColors[freq]}`}>
            {recurrenceLabels[freq]}
          </span>
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays size={11} />starts {task.dueDate}
            </span>
          )}
          {task.priority !== "none" && (
            <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
          )}
          {task.list && (
            <span className="text-xs bg-accent text-accent-foreground px-1.5 rounded">{task.list}</span>
          )}
        </div>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
