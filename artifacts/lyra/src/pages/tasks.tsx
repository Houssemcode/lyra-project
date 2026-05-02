import { useState } from "react";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  dueDate: z.string().optional(),
  list: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

const priorityColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
  none: "text-muted-foreground",
};

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const params = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  };

  const { data: tasks, isLoading } = useListTasks(params);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", priority: "none" },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
  }

  function onSubmit(values: TaskFormValues) {
    createTask.mutate(
      { data: { title: values.title, description: values.description ?? null, priority: values.priority, dueDate: values.dueDate ?? null, list: values.list ?? null } },
      {
        onSuccess: () => {
          invalidate();
          form.reset();
          setShowDialog(false);
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
    deleteTask.mutate({ id }, { onSuccess: invalidate });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks ? `${tasks.filter((t) => t.status === "pending").length} pending` : ""}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-task" size="sm">
          <Plus size={15} className="mr-1.5" /> Add Task
        </Button>
      </div>

      {/* Filters */}
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

      {/* Task list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : tasks?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
            <p>No tasks found</p>
            <p className="text-sm mt-1">Add one to get started</p>
          </div>
        ) : (
          tasks?.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 bg-card border border-card-border rounded-xl px-4 py-3 group hover:border-primary/20 transition-colors"
              data-testid={`task-item-${task.id}`}
            >
              <button
                className="mt-0.5 shrink-0 transition-transform active:scale-90"
                onClick={() => toggleStatus(task.id, task.status)}
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
                <div className="flex gap-2 mt-1 flex-wrap">
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                  )}
                  {task.priority !== "none" && (
                    <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                  )}
                  {task.list && (
                    <span className="text-xs bg-accent text-accent-foreground px-1.5 rounded">{task.list}</span>
                  )}
                  {task.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 rounded">#{tag}</span>
                  ))}
                </div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                onClick={() => handleDelete(task.id)}
                data-testid={`button-delete-task-${task.id}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add task dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" {...form.register("dueDate")} data-testid="input-task-due-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="list">List</Label>
              <Input id="list" placeholder="e.g. Work, Personal" {...form.register("list")} data-testid="input-task-list" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending} data-testid="button-submit-task">
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
