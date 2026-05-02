import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useUpdateSettings,
  useCalculatePrayerTimes,
  getListPrayersQueryKey,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Sparkles, User, Moon, Check, ChevronRight,
  Loader2, Navigation, MapPin, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRAYER_METHODS = [
  { value: "MoonsightingCommittee", label: "Moonsighting Committee",         region: "UK, US, Western" },
  { value: "MuslimWorldLeague",     label: "Muslim World League",            region: "Europe, Far East, Americas" },
  { value: "NorthAmerica",          label: "ISNA — North America",          region: "North America" },
  { value: "Egyptian",              label: "Egyptian General Authority",     region: "Africa, Syria, Malaysia" },
  { value: "Karachi",               label: "Univ. of Islamic Sciences",     region: "Pakistan, Bangladesh, India" },
  { value: "UmmAlQura",             label: "Umm Al-Qura University",        region: "Arabian Peninsula" },
  { value: "Gulf",                  label: "Gulf Region",                   region: "Gulf countries" },
  { value: "Kuwait",                label: "Kuwait",                        region: "Kuwait" },
  { value: "Qatar",                 label: "Qatar",                         region: "Qatar" },
  { value: "Singapore",             label: "Majlis Ugama Islam Singapura",  region: "Singapore, Malaysia" },
  { value: "Tehran",                label: "Institute of Geophysics Tehran",region: "Iran, Shia" },
  { value: "Turkey",                label: "Diyanet — Turkey",              region: "Turkey" },
];

const MADHAB_OPTIONS = [
  { value: "Shafi",  label: "Shafi'i / Maliki / Hanbali", desc: "Earlier Asr" },
  { value: "Hanafi", label: "Hanafi",                      desc: "Later Asr" },
];

const STEPS = ["welcome", "name", "prayer", "done"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS = ["Welcome", "Your name", "Prayer setup", "Done"];

// ── Animations ────────────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState(1);

  // Collected data
  const [displayName, setDisplayName] = useState("");
  const [prayerMethod, setPrayerMethod] = useState("MoonsightingCommittee");
  const [prayerMadhab, setPrayerMadhab] = useState("Shafi");

  // Location state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  const updateSettings = useUpdateSettings();
  const calculatePrayers = useCalculatePrayerTimes();
  const queryClient = useQueryClient();

  function goTo(next: Step) {
    setDirection(STEPS.indexOf(next) > STEPS.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setGeoState("error");
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoState("loading");
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGeoState("ok");
      },
      (err) => {
        setGeoState("error");
        setGeoError(
          err.code === 1
            ? "Location permission was denied. You can set it up later in Settings."
            : "Could not determine your location. Try again or skip."
        );
      },
      { timeout: 10_000 }
    );
  }

  async function handlePrayerContinue() {
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        data: {
          displayName: displayName.trim() || null,
          prayerMethod,
          prayerMadhab,
        },
      });
      if (lat !== null && lng !== null) {
        await calculatePrayers.mutateAsync({
          data: {
            latitude: lat,
            longitude: lng,
            date: format(new Date(), "yyyy-MM-dd"),
            method: prayerMethod,
          },
        });
        queryClient.invalidateQueries({ queryKey: getListPrayersQueryKey() });
      }
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      goTo("done");
    } catch {
      // still move on — non-critical
      goTo("done");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    // If prayer step was skipped entirely, save at least the name
    if (!updateSettings.isSuccess) {
      try {
        await updateSettings.mutateAsync({
          data: { displayName: displayName.trim() || null },
        });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      } catch { /* ignore */ }
    }
    onComplete();
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md px-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        {step !== "done" && (
          <div className="flex justify-center gap-2 mb-6">
            {STEP_LABELS.slice(0, -1).map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                    i <= stepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {step === "welcome" && (
                <WelcomeStep onNext={() => goTo("name")} />
              )}
              {step === "name" && (
                <NameStep
                  displayName={displayName}
                  onChange={setDisplayName}
                  onNext={() => goTo("prayer")}
                  onSkip={() => goTo("prayer")}
                />
              )}
              {step === "prayer" && (
                <PrayerStep
                  lat={lat}
                  lng={lng}
                  locationLabel={locationLabel}
                  geoState={geoState}
                  geoError={geoError}
                  prayerMethod={prayerMethod}
                  prayerMadhab={prayerMadhab}
                  onGetLocation={handleGetLocation}
                  onMethodChange={setPrayerMethod}
                  onMadhabChange={setPrayerMadhab}
                  onContinue={handlePrayerContinue}
                  onSkip={() => goTo("done")}
                  saving={saving}
                />
              )}
              {step === "done" && (
                <DoneStep
                  displayName={displayName}
                  hasLocation={lat !== null}
                  prayerMethod={prayerMethod}
                  onFinish={handleFinish}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Step: Welcome ─────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="px-8 py-10 text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/15 flex items-center justify-center shadow-lg shadow-primary/10">
          <Sparkles size={36} className="text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-widest text-primary/70 uppercase">
          Assalamu Alaykum
        </p>
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: "var(--app-font-display)" }}
        >
          Welcome to Lyra
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Your personal companion for productivity, habits, and spiritual growth — all in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-left">
        {[
          { icon: "✅", label: "Tasks & habits" },
          { icon: "🕌", label: "Prayer tracker" },
          { icon: "📖", label: "Quran & deeds" },
          { icon: "⏱️", label: "Focus sessions" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2.5 text-xs text-muted-foreground"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={onNext}>
        Get Started <ChevronRight size={16} className="ml-1" />
      </Button>
    </div>
  );
}

// ── Step: Name ────────────────────────────────────────────────────────────────

function NameStep({
  displayName,
  onChange,
  onNext,
  onSkip,
}: {
  displayName: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="px-8 py-10 space-y-7">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--app-font-display)" }}
          >
            What should we call you?
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used in greetings and summaries throughout the app
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-name" className="text-sm">
          Your name
        </Label>
        <Input
          id="onboarding-name"
          value={displayName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Ahmad"
          className="text-base"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && onNext()}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          className="w-full"
          size="lg"
          onClick={onNext}
          disabled={!displayName.trim()}
        >
          Continue <ChevronRight size={16} className="ml-1" />
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ── Step: Prayer ──────────────────────────────────────────────────────────────

function PrayerStep({
  lat, lng, locationLabel, geoState, geoError,
  prayerMethod, prayerMadhab,
  onGetLocation, onMethodChange, onMadhabChange,
  onContinue, onSkip, saving,
}: {
  lat: number | null; lng: number | null; locationLabel: string | null;
  geoState: "idle" | "loading" | "ok" | "error"; geoError: string | null;
  prayerMethod: string; prayerMadhab: string;
  onGetLocation: () => void; onMethodChange: (v: string) => void;
  onMadhabChange: (v: string) => void; onContinue: () => void;
  onSkip: () => void; saving: boolean;
}) {
  const selectedMethod = PRAYER_METHODS.find((m) => m.value === prayerMethod);

  return (
    <div className="px-8 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 flex items-center justify-center shrink-0">
          <Moon size={20} className="text-indigo-400" />
        </div>
        <div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--app-font-display)" }}
          >
            Set up prayer times
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            We'll calculate accurate times for your location
          </p>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="text-sm">Your location</Label>
        {geoState === "ok" && locationLabel ? (
          <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="text-sm text-primary font-medium flex-1">{locationLabel}</span>
            <Check size={14} className="text-primary" />
          </div>
        ) : (
          <button
            onClick={onGetLocation}
            disabled={geoState === "loading"}
            className="w-full flex items-center gap-3 bg-muted/20 hover:bg-muted/30 border border-dashed border-card-border rounded-xl px-4 py-3.5 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {geoState === "loading" ? (
              <Loader2 size={15} className="text-muted-foreground animate-spin" />
            ) : (
              <Navigation size={15} className="text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {geoState === "loading" ? "Detecting location…" : "Use my current location"}
            </span>
          </button>
        )}
        {geoState === "error" && geoError && (
          <div className="flex items-start gap-2 text-xs text-destructive/80 bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            {geoError}
          </div>
        )}
      </div>

      {/* Prayer method */}
      <div className="space-y-2">
        <Label className="text-sm">Calculation method</Label>
        <Select value={prayerMethod} onValueChange={onMethodChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {PRAYER_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <span>{m.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">— {m.region}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMethod && (
          <p className="text-xs text-muted-foreground">{selectedMethod.region}</p>
        )}
      </div>

      {/* Madhab */}
      <div className="space-y-2">
        <Label className="text-sm">Madhab (Asr time)</Label>
        <Select value={prayerMadhab} onValueChange={onMadhabChange}>
          <SelectTrigger>
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
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full"
          size="lg"
          onClick={onContinue}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 size={15} className="mr-2 animate-spin" /> Saving…</>
          ) : (
            <>{lat !== null ? "Calculate & Continue" : "Continue"} <ChevronRight size={16} className="ml-1" /></>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip}>
          Skip prayer setup
        </Button>
      </div>
    </div>
  );
}

// ── Step: Done ────────────────────────────────────────────────────────────────

function DoneStep({
  displayName, hasLocation, prayerMethod, onFinish,
}: {
  displayName: string; hasLocation: boolean;
  prayerMethod: string; onFinish: () => void;
}) {
  const methodLabel = PRAYER_METHODS.find((m) => m.value === prayerMethod)?.label ?? prayerMethod;

  return (
    <div className="px-8 py-10 text-center space-y-6">
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center"
        >
          <Check size={36} className="text-emerald-400" />
        </motion.div>
      </div>

      <div className="space-y-1.5">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--app-font-display)" }}
        >
          You're all set{displayName ? `, ${displayName}` : ""}!
        </h2>
        <p className="text-sm text-muted-foreground">
          Lyra is ready. Here's what's configured:
        </p>
      </div>

      <div className="space-y-2 text-left">
        {[
          { icon: "✅", label: "Display name", value: displayName || "Not set (can change in Settings)" },
          { icon: "🕌", label: "Prayer method", value: methodLabel },
          { icon: "📍", label: "Prayer times", value: hasLocation ? "Calculated for your location" : "Not set up (do it from Islamic Life)" },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 bg-muted/15 rounded-xl px-4 py-3">
            <span className="text-base shrink-0">{icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium leading-snug">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={onFinish}>
        Open Lyra <Sparkles size={15} className="ml-1.5" />
      </Button>
    </div>
  );
}
