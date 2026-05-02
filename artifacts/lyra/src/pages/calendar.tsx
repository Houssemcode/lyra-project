import { useState } from "react";
import {
  useListEvents,
  useCreateEvent,
  useDeleteEvent,
  getListEventsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";

const eventSchema = z.object({
  title: z.string().min(1, "Title required"),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().optional(),
  allDay: z.boolean().default(false),
  category: z.string().optional(),
  description: z.string().optional(),
});
type EventFormValues = z.infer<typeof eventSchema>;

type ViewMode = "week" | "day";

export default function Calendar() {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");

  const { data: events, isLoading } = useListEvents({ start: startStr, end: endStr });
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", allDay: false },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({ start: startStr, end: endStr }) });
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
  }

  function onSubmit(values: EventFormValues) {
    const startTime = values.allDay
      ? `${values.startTime}T00:00:00Z`
      : values.startTime;
    createEvent.mutate(
      {
        data: {
          title: values.title,
          startTime,
          endTime: values.endTime || null,
          allDay: values.allDay,
          category: values.category || null,
          description: values.description || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          form.reset();
          setShowDialog(false);
        },
      }
    );
  }

  function handleDelete(id: string) {
    deleteEvent.mutate({ id }, { onSuccess: invalidate });
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-1.5 hover:bg-accent rounded-lg transition-colors" data-testid="button-prev-week">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </h1>
          <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1.5 hover:bg-accent rounded-lg transition-colors" data-testid="button-next-week">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-accent transition-colors"
            data-testid="button-today"
          >
            Today
          </button>
        </div>
        <Button onClick={() => setShowDialog(true)} size="sm" data-testid="button-add-event">
          <Plus size={15} className="mr-1.5" /> Add Event
        </Button>
      </div>

      {/* Week grid */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={`px-3 py-3 text-center border-r border-border last:border-r-0 ${isToday ? "bg-primary/10" : ""}`}>
                <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                <p className={`text-sm font-semibold mt-0.5 ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</p>
              </div>
            );
          })}
        </div>

        {/* Events */}
        <div className="grid grid-cols-7 min-h-[300px]">
          {weekDays.map((day) => {
            const dayEvents = events?.filter((e) => {
              const eventDate = parseISO(e.startTime);
              return isSameDay(eventDate, day);
            }) ?? [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={`px-2 py-2 border-r border-border last:border-r-0 min-h-[200px] ${isToday ? "bg-primary/5" : ""}`}
              >
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`group mb-1.5 px-2 py-1.5 rounded-lg text-xs cursor-default ${
                        event.source === "prayer" ? "bg-indigo-500/15 text-indigo-300" :
                        event.source === "task" ? "bg-orange-500/15 text-orange-300" :
                        "bg-primary/15 text-primary"
                      }`}
                      data-testid={`event-${event.id}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          {!event.allDay && (
                            <p className="opacity-70 mt-0.5">{format(parseISO(event.startTime), "HH:mm")}</p>
                          )}
                        </div>
                        {event.source === "native" && (
                          <button
                            className="opacity-0 group-hover:opacity-100 shrink-0 hover:text-destructive transition-all"
                            onClick={() => handleDelete(event.id)}
                            data-testid={`button-delete-event-${event.id}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">This Week</h2>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : events?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No events this week</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events?.map((event) => (
              <div key={event.id} className="flex items-center gap-3 bg-card border border-card-border rounded-xl px-4 py-3 group" data-testid={`event-list-${event.id}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${event.source === "native" ? "bg-primary" : event.source === "prayer" ? "bg-indigo-400" : "bg-orange-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(event.startTime), "EEE, MMM d · HH:mm")}
                    {event.endTime && ` – ${format(parseISO(event.endTime), "HH:mm")}`}
                  </p>
                </div>
                {event.category && (
                  <span className="text-xs bg-accent px-2 py-0.5 rounded-full text-muted-foreground">{event.category}</span>
                )}
                {event.source === "native" && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    onClick={() => handleDelete(event.id)}
                    data-testid={`button-delete-event-list-${event.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add event dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input placeholder="Event title" {...form.register("title")} data-testid="input-event-title" />
              {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.watch("allDay")}
                onCheckedChange={(v) => form.setValue("allDay", v)}
                id="allDay"
                data-testid="switch-all-day"
              />
              <Label htmlFor="allDay">All day</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input
                  type={form.watch("allDay") ? "date" : "datetime-local"}
                  {...form.register("startTime")}
                  data-testid="input-event-start"
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type={form.watch("allDay") ? "date" : "datetime-local"}
                  {...form.register("endTime")}
                  data-testid="input-event-end"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Input placeholder="e.g. Work, Personal" {...form.register("category")} data-testid="input-event-category" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createEvent.isPending} data-testid="button-submit-event">
                {createEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
