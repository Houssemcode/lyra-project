import { useEffect } from "react";
import { useListPrayers, useGetTodayHabits } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";

const PRAYER_ICONS: Record<string, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "✨",
};

export function NotificationScheduler() {
  const { prefs } = useNotificationPrefs();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: prayers } = useListPrayers({ date: today });
  const { data: habits } = useGetTodayHabits();

  useEffect(() => {
    if (
      !prefs.enabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    function schedule(delay: number, title: string, body: string, tag: string) {
      if (delay <= 0) return;
      timeouts.push(
        setTimeout(() => {
          new Notification(title, {
            body,
            tag,
            icon: "/favicon.ico",
            silent: false,
          });
        }, delay)
      );
    }

    // ── Prayer reminders ──────────────────────────────────────────────────────
    if (prefs.prayerReminderEnabled && prayers) {
      for (const prayer of prayers) {
        if (!prayer.scheduledTime || prayer.status !== "pending") continue;
        const parts = prayer.scheduledTime.split(":");
        const h = parseInt(parts[0] ?? "0", 10);
        const m = parseInt(parts[1] ?? "0", 10);
        const prayerMs = new Date().setHours(h, m, 0, 0);
        const fireAt = prayerMs - prefs.prayerReminderMins * 60_000;
        schedule(
          fireAt - now,
          `${PRAYER_ICONS[prayer.name] ?? "🕌"} ${prayer.name} in ${prefs.prayerReminderMins} min`,
          `${prayer.name} prayer begins at ${prayer.scheduledTime}`,
          `prayer-${prayer.name}-${today}`
        );
      }
    }

    // ── Habit reminder ────────────────────────────────────────────────────────
    if (prefs.habitReminderEnabled && prefs.habitReminderTime) {
      const hParts = prefs.habitReminderTime.split(":");
      const h = parseInt(hParts[0] ?? "20", 10);
      const m = parseInt(hParts[1] ?? "0", 10);
      const fireAt = new Date().setHours(h, m, 0, 0);
      const pending = habits?.filter((hb) => !hb.todayStatus).length ?? 0;
      schedule(
        fireAt - now,
        "🔥 Habit Check-In",
        pending > 0
          ? `${pending} habit${pending !== 1 ? "s" : ""} still to log today`
          : "All habits logged — great work today!",
        `habit-reminder-${today}`
      );
    }

    // ── Summary reminder ──────────────────────────────────────────────────────
    if (prefs.summaryReminderEnabled && prefs.summaryReminderTime) {
      const sParts = prefs.summaryReminderTime.split(":");
      const h = parseInt(sParts[0] ?? "21", 10);
      const m = parseInt(sParts[1] ?? "0", 10);
      const fireAt = new Date().setHours(h, m, 0, 0);
      schedule(
        fireAt - now,
        "📊 Daily Wrap-Up",
        "Open Lyra to review your daily summary",
        `summary-reminder-${today}`
      );
    }

    return () => timeouts.forEach(clearTimeout);
  }, [prefs, prayers, habits, today]);

  return null;
}
