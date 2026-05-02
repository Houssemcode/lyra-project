import { useState, useCallback } from "react";

export interface NotifPrefs {
  enabled: boolean;
  prayerReminderEnabled: boolean;
  prayerReminderMins: number;
  habitReminderEnabled: boolean;
  habitReminderTime: string;
  summaryReminderEnabled: boolean;
  summaryReminderTime: string;
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled: false,
  prayerReminderEnabled: true,
  prayerReminderMins: 10,
  habitReminderEnabled: true,
  habitReminderTime: "20:00",
  summaryReminderEnabled: false,
  summaryReminderTime: "21:00",
};

const STORAGE_KEY = "lyra_notif_prefs";

function load(): NotifPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) as Partial<NotifPrefs> };
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFS };
}

function persist(prefs: NotifPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useNotificationPrefs() {
  const [prefs, setPrefsState] = useState<NotifPrefs>(load);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const setPrefs = useCallback((update: Partial<NotifPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...update };
      persist(next);
      return next;
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    const perm = await requestPermission();
    if (perm === "granted") {
      setPrefs({ enabled: true });
      return true;
    }
    return false;
  }, [requestPermission, setPrefs]);

  const disable = useCallback(() => {
    setPrefs({ enabled: false });
  }, [setPrefs]);

  return { prefs, setPrefs, permission, enable, disable };
}
