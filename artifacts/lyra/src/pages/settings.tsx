import { useEffect, useState } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, User, Moon, Clock, CheckCircle2, Info, Bell, BellOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";

const PRAYER_METHODS: { value: string; label: string; region: string }[] = [
  { value: "MuslimWorldLeague",      label: "Muslim World League",         region: "Europe, Far East, Americas" },
  { value: "NorthAmerica",           label: "Islamic Society of North America (ISNA)", region: "North America" },
  { value: "Egyptian",               label: "Egyptian General Authority",  region: "Africa, Syria, Lebanon, Malaysia" },
  { value: "Karachi",                label: "University of Islamic Sciences, Karachi", region: "Pakistan, Bangladesh, India, Afghanistan" },
  { value: "UmmAlQura",              label: "Umm Al-Qura University",       region: "Arabian Peninsula (Makkah)" },
  { value: "Gulf",                   label: "Gulf Region",                  region: "Gulf countries" },
  { value: "MoonsightingCommittee",  label: "Moonsighting Committee",       region: "Western countries (UK, US)" },
  { value: "Kuwait",                 label: "Kuwait",                       region: "Kuwait" },
  { value: "Qatar",                  label: "Qatar",                        region: "Qatar" },
  { value: "Singapore",              label: "Majlis Ugama Islam Singapura", region: "Singapore, Malaysia, Indonesia" },
  { value: "Tehran",                 label: "Institute of Geophysics, Tehran", region: "Iran, Shia communities" },
  { value: "Turkey",                 label: "Diyanet İşleri Başkanlığı",   region: "Turkey" },
];

const MADHAB_OPTIONS = [
  { value: "Shafi",  label: "Shafi'i / Maliki / Hanbali", desc: "Earlier Asr time" },
  { value: "Hanafi", label: "Hanafi",                      desc: "Later Asr time" },
];

const TIME_FORMAT_OPTIONS = [
  { value: "24h", label: "24-hour (14:30)" },
  { value: "12h", label: "12-hour (2:30 PM)" },
];

const PRAYER_REMINDER_MINS = [5, 10, 15, 20, 30];

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-card-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="w-64 shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  children,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
      {checked && children && (
        <div className="pl-1 pt-1">{children}</div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [displayName, setDisplayName] = useState("");
  const [prayerMethod, setPrayerMethod] = useState("MoonsightingCommittee");
  const [prayerMadhab, setPrayerMadhab] = useState("Shafi");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { prefs, setPrefs, permission, enable, disable } = useNotificationPrefs();

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName ?? "");
      setPrayerMethod(settings.prayerMethod);
      setPrayerMadhab(settings.prayerMadhab);
      setTimeFormat(settings.timeFormat);
    }
  }, [settings]);

  function markDirty() { setDirty(true); setSaved(false); }

  function handleSave() {
    updateSettings.mutate(
      {
        data: {
          displayName: displayName || null,
          prayerMethod,
          prayerMadhab,
          timeFormat,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setSaved(true);
          setDirty(false);
          setTimeout(() => setSaved(false), 3000);
        },
      }
    );
  }

  async function handleNotifToggle(on: boolean) {
    if (on) {
      await enable();
    } else {
      disable();
    }
  }

  const selectedMethod = PRAYER_METHODS.find((m) => m.value === prayerMethod);
  const notifSupported = typeof Notification !== "undefined";
  const notifDenied = permission === "denied";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon size={18} className="text-muted-foreground" />
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">Preferences and configuration for Lyra</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || updateSettings.isPending}
            data-testid="button-save-settings"
          >
            {updateSettings.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Profile ── */}
          <SectionCard icon={<User size={14} className="text-primary" />} title="Profile">
            <FieldRow label="Display Name" hint="Used in greetings and summaries throughout the app">
              <Input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
                placeholder="e.g. Ahmad"
                data-testid="input-display-name"
              />
            </FieldRow>
          </SectionCard>

          {/* ── Prayer Settings ── */}
          <SectionCard icon={<Moon size={14} className="text-primary" />} title="Prayer Calculation">
            <FieldRow
              label="Calculation Method"
              hint={selectedMethod ? selectedMethod.region : "Determines Fajr and Isha angles"}
            >
              <Select
                value={prayerMethod}
                onValueChange={(v) => { setPrayerMethod(v); markDirty(); }}
              >
                <SelectTrigger data-testid="select-prayer-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {PRAYER_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Madhab (Asr Calculation)">
              <Select
                value={prayerMadhab}
                onValueChange={(v) => { setPrayerMadhab(v); markDirty(); }}
              >
                <SelectTrigger data-testid="select-prayer-madhab">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MADHAB_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span>{m.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {m.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-400 leading-relaxed">
                Changes take effect the next time you calculate prayer times. Re-click "Calculate Prayer Times" on the Prayers page or Islamic Life page to update today's schedule.
              </p>
            </div>
          </SectionCard>

          {/* ── Notifications ── */}
          <SectionCard icon={<Bell size={14} className="text-primary" />} title="Notifications">
            {!notifSupported ? (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                Your browser does not support notifications.
              </div>
            ) : notifDenied ? (
              <div className="flex items-start gap-2 text-xs bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
                <BellOff size={13} className="mt-0.5 shrink-0 text-destructive" />
                <span className="text-destructive/80">
                  Notifications are blocked in your browser. To re-enable, click the lock icon in your address bar and allow notifications for this site, then refresh.
                </span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Master enable */}
                <ToggleRow
                  label="Enable Notifications"
                  hint={
                    prefs.enabled
                      ? "Active — reminders will fire while this tab is open"
                      : "Off — no reminders will be sent"
                  }
                  checked={prefs.enabled}
                  onCheckedChange={handleNotifToggle}
                />

                {prefs.enabled && (
                  <div className="border-t border-card-border pt-4 space-y-5">
                    {/* Prayer reminders */}
                    <ToggleRow
                      label="Prayer Reminders"
                      hint="Get notified before each prayer time"
                      checked={prefs.prayerReminderEnabled}
                      onCheckedChange={(v) => setPrefs({ prayerReminderEnabled: v })}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground shrink-0">Remind me</span>
                        <Select
                          value={String(prefs.prayerReminderMins)}
                          onValueChange={(v) => setPrefs({ prayerReminderMins: parseInt(v, 10) })}
                        >
                          <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRAYER_REMINDER_MINS.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} minutes before
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </ToggleRow>

                    {/* Habit check-in */}
                    <ToggleRow
                      label="Daily Habit Reminder"
                      hint="A nudge to log your habits before the day ends"
                      checked={prefs.habitReminderEnabled}
                      onCheckedChange={(v) => setPrefs({ habitReminderEnabled: v })}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground shrink-0">Remind at</span>
                        <Input
                          type="time"
                          value={prefs.habitReminderTime}
                          onChange={(e) => setPrefs({ habitReminderTime: e.target.value })}
                          className="h-8 text-xs w-32"
                        />
                      </div>
                    </ToggleRow>

                    {/* Daily summary */}
                    <ToggleRow
                      label="Daily Summary Reminder"
                      hint="End-of-day nudge to review your summary"
                      checked={prefs.summaryReminderEnabled}
                      onCheckedChange={(v) => setPrefs({ summaryReminderEnabled: v })}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground shrink-0">Remind at</span>
                        <Input
                          type="time"
                          value={prefs.summaryReminderTime}
                          onChange={(e) => setPrefs({ summaryReminderTime: e.target.value })}
                          className="h-8 text-xs w-32"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-muted/20 rounded-xl px-4 py-3">
                  <Bell size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Reminders fire while Lyra is open in any browser tab. Notification preferences are stored locally on this device.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Display ── */}
          <SectionCard icon={<Clock size={14} className="text-primary" />} title="Display">
            <FieldRow label="Time Format">
              <Select
                value={timeFormat}
                onValueChange={(v) => { setTimeFormat(v); markDirty(); }}
              >
                <SelectTrigger data-testid="select-time-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </SectionCard>

          {/* ── About ── */}
          <SectionCard icon={<Info size={14} className="text-primary" />} title="About Lyra">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">v1.3.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modules</span>
                <span className="text-xs text-right">Tasks · Habits · Calendar · Prayers · Focus · Islamic Life · Progress · Reports</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prayer engine</span>
                <span className="text-xs font-mono">adhan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hijri calendar</span>
                <span className="text-xs font-mono">Intl.DateTimeFormat</span>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
