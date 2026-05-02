import { useState } from "react";
import {
  useGetQuranProgress,
  useInitQuranProgress,
  useUpdateQuranProgress,
  useListDeeds,
  useLogDeed,
  useListDeedLogs,
  useCalculatePrayerTimes,
  getGetQuranProgressQueryKey,
  getListDeedLogsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Moon, Star, Zap, Gift, Heart, Sun,
  MapPin, Check, RefreshCw, Plus, Target, BookMarked
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ─── Hijri date (browser Intl API) ───────────────────────────────────────────
function getHijriDate(): { full: string; day: number; month: number; year: number; dayOfWeek: number } {
  const now = new Date();
  const hijri = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const hijriNum = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(now);
  const parts = hijriNum.split("/");
  return {
    full: hijri,
    month: parseInt(parts[0] ?? "1"),
    day: parseInt(parts[1] ?? "1"),
    year: parseInt(parts[2] ?? "1446"),
    dayOfWeek: now.getDay(),
  };
}

// ─── Special Hijri months ─────────────────────────────────────────────────────
const HIJRI_MONTH_BANNERS: Record<number, { label: string; desc: string; color: string; bg: string; border: string }> = {
  1:  { label: "Muharram", desc: "One of the four sacred months — fasting on Ashura (10th) expiates the previous year", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  3:  { label: "Rabi' Al-Awwal", desc: "The month of the Prophet's ﷺ birth — increase salah upon him abundantly", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  7:  { label: "Rajab", desc: "One of the four sacred months — a gateway to Ramadan, increase istighfar and voluntary fasts", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
  8:  { label: "Sha'ban", desc: "The month before Ramadan — the Prophet ﷺ fasted most of it and our deeds are raised to Allah", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25" },
  9:  { label: "Ramadan", desc: "The blessed month of fasting, Quran, and Laylat Al-Qadr — the best month of the year", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  10: { label: "Shawwal", desc: "Eid Al-Fitr and the six voluntary fasts of Shawwal — fasting them equals a full year", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
  11: { label: "Dhul Qa'dah", desc: "One of the four sacred months — refrain from wrongdoing and increase worship", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/25" },
  12: { label: "Dhul Hijjah", desc: "The first 10 days are the best days of the year — fast on Arafah (9th) to expiate two years", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/25" },
};

const categoryIcons: Record<string, React.ReactNode> = {
  "prayer": <Sun size={15} className="text-yellow-400" />,
  "fasting": <Moon size={15} className="text-indigo-400" />,
  "quran": <BookOpen size={15} className="text-teal-400" />,
  "dhikr": <Star size={15} className="text-amber-400" />,
  "charity": <Heart size={15} className="text-rose-400" />,
  "sunnah": <Zap size={15} className="text-blue-400" />,
  "jumu'ah": <Star size={15} className="text-emerald-400" />,
  "other": <Gift size={15} className="text-purple-400" />,
};

const categoryColors: Record<string, string> = {
  "prayer": "bg-yellow-500/10 border-yellow-500/20",
  "fasting": "bg-indigo-500/10 border-indigo-500/20",
  "quran": "bg-teal-500/10 border-teal-500/20",
  "dhikr": "bg-amber-500/10 border-amber-500/20",
  "charity": "bg-rose-500/10 border-rose-500/20",
  "sunnah": "bg-blue-500/10 border-blue-500/20",
  "jumu'ah": "bg-emerald-500/10 border-emerald-500/20",
  "other": "bg-purple-500/10 border-purple-500/20",
};

const SURAH_NAMES: Record<number, string> = {
  1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Aal-Imran", 4: "An-Nisa",
  5: "Al-Maidah", 6: "Al-An'am", 7: "Al-A'raf", 8: "Al-Anfal",
  9: "At-Tawbah", 10: "Yunus", 11: "Hud", 12: "Yusuf",
  18: "Al-Kahf", 36: "Ya-Sin", 55: "Ar-Rahman", 67: "Al-Mulk",
  112: "Al-Ikhlas", 113: "Al-Falaq", 114: "An-Nas",
};

export default function Islamic() {
  const hijri = getHijriDate();
  const today = format(new Date(), "yyyy-MM-dd");
  const isFriday = hijri.dayOfWeek === 5;
  const queryClient = useQueryClient();

  const [showQuranInit, setShowQuranInit] = useState(false);
  const [showQuranUpdate, setShowQuranUpdate] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  // Quran form state
  const [initPage, setInitPage] = useState(1);
  const [initSurah, setInitSurah] = useState(1);
  const [initTarget, setInitTarget] = useState("");

  const { data: quran, isLoading: quranLoading } = useGetQuranProgress();
  const { data: allDeeds, isLoading: deedsLoading } = useListDeeds();
  const { data: todayDeeds } = useListDeeds({ todayOnly: true });
  const { data: todayLogs, isLoading: logsLoading } = useListDeedLogs({ date: today });

  const initQuran = useInitQuranProgress();
  const updateQuran = useUpdateQuranProgress();
  const logDeed = useLogDeed();
  const calculatePrayers = useCalculatePrayerTimes();

  function invalidateLogs() {
    queryClient.invalidateQueries({ queryKey: getListDeedLogsQueryKey({ date: today }) });
  }

  function invalidateQuran() {
    queryClient.invalidateQueries({ queryKey: getGetQuranProgressQueryKey() });
  }

  function handleInitQuran() {
    initQuran.mutate(
      { data: { currentPage: initPage, currentSurah: initSurah, targetDate: initTarget || null } },
      { onSuccess: () => { invalidateQuran(); setShowQuranInit(false); } }
    );
  }

  function handleLogDeed(id: string) {
    logDeed.mutate(
      { id, data: { status: "completed", date: today, hijriDate: hijri.full } },
      { onSuccess: invalidateLogs }
    );
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        calculatePrayers.mutate(
          { data: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, date: today } },
          {
            onSuccess: () => {
              setLocationStatus("done");
              queryClient.invalidateQueries();
              setTimeout(() => setShowLocationDialog(false), 1500);
            },
            onError: () => {
              setLocationStatus("error");
              setGeoError("Failed to calculate prayer times.");
            },
          }
        );
      },
      (err) => {
        setLocationStatus("error");
        setGeoError(err.message);
      }
    );
  }

  const loggedIds = new Set(todayLogs?.map((l) => l.activityId) ?? []);

  // Group all deeds by category
  const deedsByCategory = (allDeeds ?? []).reduce<Record<string, typeof allDeeds>>((acc, d) => {
    if (!d) return acc;
    acc[d.category] = [...(acc[d.category] ?? []), d];
    return acc;
  }, {});

  const categoryOrder = ["jumu'ah", "dhikr", "prayer", "quran", "fasting", "charity", "sunnah", "other"];

  const monthBanner = HIJRI_MONTH_BANNERS[hijri.month];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header with Hijri date */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Moon size={18} className="text-indigo-400" />
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-display)" }}>Islamic Life</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{hijri.full}</span>
            {isFriday && (
              <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Jumu'ah Mubarak
              </span>
            )}
            {hijri.day >= 13 && hijri.day <= 15 && (
              <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                Al-Ayyam Al-Bid (White Days)
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLocationDialog(true)} data-testid="button-calculate-prayers">
          <MapPin size={13} className="mr-1.5" /> Calculate Prayer Times
        </Button>
      </div>

      {/* Special Hijri month banner */}
      {monthBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${monthBanner.bg} border ${monthBanner.border} rounded-2xl p-4 flex items-start gap-3`}
          data-testid="hijri-month-banner"
        >
          <Star size={16} className={`${monthBanner.color} shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm font-semibold ${monthBanner.color}`}>{monthBanner.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{monthBanner.desc}</p>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ─── Quran Khatmah Tracker ──────────────────────────────────────────── */}
        <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                <BookOpen size={16} className="text-teal-400" />
              </div>
              <h2 className="font-semibold">Khatmah Tracker</h2>
            </div>
            {quran && (
              <Button variant="ghost" size="sm" onClick={() => setShowQuranUpdate(true)} data-testid="button-update-quran">
                Update
              </Button>
            )}
          </div>

          {quranLoading ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : !quran ? (
            <div className="text-center py-6">
              <BookMarked size={32} className="mx-auto mb-3 text-teal-400/40" />
              <p className="text-sm text-muted-foreground mb-3">Start your Quran Khatmah</p>
              <Button onClick={() => setShowQuranInit(true)} size="sm" data-testid="button-init-quran">
                <Plus size={13} className="mr-1.5" /> Begin Khatmah
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress ring + stats */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - quran.percentComplete / 100)}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{quran.percentComplete}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div>
                    <p className="text-xs text-muted-foreground">Current position</p>
                    <p className="text-sm font-semibold">
                      Page {quran.currentPage}
                      {SURAH_NAMES[quran.currentSurah] && (
                        <span className="text-muted-foreground font-normal"> · {SURAH_NAMES[quran.currentSurah]}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{quran.pagesLeft} pages remaining</p>
                  </div>
                </div>
              </div>

              {/* Daily target */}
              <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-3 flex items-center gap-3">
                <Target size={16} className="text-teal-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Read {quran.dailyTarget} page{quran.dailyTarget !== 1 ? "s" : ""} today</p>
                  {quran.targetDate && quran.daysToComplete !== null && (
                    <p className="text-xs text-muted-foreground">
                      {quran.daysToComplete} days until {quran.targetDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick update: +1 page button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  updateQuran.mutate(
                    { data: { currentPage: Math.min(604, quran.currentPage + quran.dailyTarget) } },
                    { onSuccess: invalidateQuran }
                  )
                }
                disabled={updateQuran.isPending}
                data-testid="button-log-pages"
              >
                <BookOpen size={14} className="mr-1.5" />
                Log {quran.dailyTarget} page{quran.dailyTarget !== 1 ? "s" : ""} read today
              </Button>
            </div>
          )}
        </div>

        {/* ─── Today's Recommended Deeds ─────────────────────────────────────── */}
        <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Star size={16} className="text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold">Today's Deeds</h2>
              <p className="text-xs text-muted-foreground">
                {todayDeeds?.length ?? 0} available · {todayLogs?.length ?? 0} completed
              </p>
            </div>
          </div>

          {deedsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (todayDeeds ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No specific deeds for today</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(todayDeeds ?? []).map((deed) => {
                const done = loggedIds.has(deed.id);
                return (
                  <motion.div
                    key={deed.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      done
                        ? "bg-primary/5 border-primary/20 opacity-60"
                        : `${categoryColors[deed.category] ?? "bg-muted/20 border-border"}`
                    }`}
                    data-testid={`deed-${deed.id}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {categoryIcons[deed.category] ?? <Gift size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? "line-through" : ""}`}>{deed.name}</p>
                      {deed.arabicName && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-arabic" dir="rtl">{deed.arabicName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{deed.rewardText}</p>
                    </div>
                    <button
                      onClick={() => !done && handleLogDeed(deed.id)}
                      disabled={done}
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        done ? "bg-primary text-primary-foreground" : "border border-border hover:bg-primary/20 hover:border-primary/40 text-muted-foreground"
                      }`}
                      data-testid={`button-log-deed-${deed.id}`}
                    >
                      <Check size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Full Deeds Catalog ────────────────────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
            <Gift size={16} className="text-rose-400" />
          </div>
          <h2 className="font-semibold">Deeds Catalog</h2>
          <span className="text-xs text-muted-foreground ml-auto">{allDeeds?.length ?? 0} deeds</span>
        </div>

        <div className="space-y-5">
          {categoryOrder.map((cat) => {
            const deeds = deedsByCategory[cat];
            if (!deeds || deeds.length === 0) return null;
            const catLabel = cat === "jumu'ah" ? "Jumu'ah (Friday)" : cat.charAt(0).toUpperCase() + cat.slice(1);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  {categoryIcons[cat]}
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{catLabel}</h3>
                  {cat === "jumu'ah" && (
                    <span className="text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">Fridays only</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {deeds.map((deed) => {
                    const done = loggedIds.has(deed.id);
                    return (
                      <div
                        key={deed.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                          done ? "bg-primary/5 border-primary/15" : "bg-muted/20 border-border hover:border-primary/20"
                        }`}
                        data-testid={`catalog-deed-${deed.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                              {deed.name}
                            </span>
                            {deed.arabicName && (
                              <span className="text-xs text-muted-foreground" dir="rtl">{deed.arabicName}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{deed.rewardText}</p>
                        </div>
                        <button
                          onClick={() => !done && handleLogDeed(deed.id)}
                          disabled={done}
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            done ? "bg-primary/20 text-primary" : "border border-border hover:bg-primary/10 hover:border-primary/30 text-muted-foreground"
                          }`}
                          data-testid={`button-log-catalog-${deed.id}`}
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Today's Deed Log ─────────────────────────────────────────────────── */}
      {(todayLogs ?? []).length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Today's Completed Deeds</h2>
          <div className="space-y-2">
            {(todayLogs ?? []).map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2" data-testid={`log-${log.id}`}>
                <Check size={14} className="text-primary shrink-0" />
                <span className="text-sm font-medium flex-1">{log.activityName}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{log.activityCategory}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(log.loggedAt), "HH:mm")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Dialogs ──────────────────────────────────────────────────────────── */}

      {/* Prayer time calculator */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calculate Prayer Times</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Allow location access to automatically calculate accurate prayer times for your current location.
            </p>
            {locationStatus === "done" && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg p-3">
                <Check size={15} /> Prayer times calculated and updated successfully
              </div>
            )}
            {locationStatus === "error" && geoError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{geoError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Uses the Moonsighting Committee calculation method. Your coordinates are only used for this calculation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationDialog(false)}>Cancel</Button>
            <Button
              onClick={handleGetLocation}
              disabled={locationStatus === "loading" || locationStatus === "done"}
              data-testid="button-get-location"
            >
              {locationStatus === "loading" ? (
                <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Calculating...</>
              ) : locationStatus === "done" ? (
                <><Check size={14} className="mr-1.5" /> Done</>
              ) : (
                <><MapPin size={14} className="mr-1.5" /> Use My Location</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Init Quran */}
      <Dialog open={showQuranInit} onOpenChange={setShowQuranInit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Begin a New Khatmah</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Page (1-604)</Label>
              <Input
                type="number"
                min={1} max={604}
                value={initPage}
                onChange={(e) => setInitPage(parseInt(e.target.value) || 1)}
                data-testid="input-quran-page"
              />
            </div>
            <div>
              <Label>Current Surah (1-114)</Label>
              <Input
                type="number"
                min={1} max={114}
                value={initSurah}
                onChange={(e) => setInitSurah(parseInt(e.target.value) || 1)}
                data-testid="input-quran-surah"
              />
            </div>
            <div>
              <Label>Target Completion Date (optional)</Label>
              <Input
                type="date"
                value={initTarget}
                onChange={(e) => setInitTarget(e.target.value)}
                data-testid="input-quran-target"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank for self-paced reading</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuranInit(false)}>Cancel</Button>
            <Button onClick={handleInitQuran} disabled={initQuran.isPending} data-testid="button-submit-quran-init">
              {initQuran.isPending ? "Starting..." : "Begin Khatmah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Quran progress */}
      <Dialog open={showQuranUpdate} onOpenChange={setShowQuranUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Reading Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <Label>Current Page</Label>
                <span className="font-semibold">{quran?.currentPage ?? 1} / 604</span>
              </div>
              <Slider
                value={[quran?.currentPage ?? 1]}
                onValueChange={([v]) =>
                  updateQuran.mutate({ data: { currentPage: v } }, { onSuccess: invalidateQuran })
                }
                min={1} max={604}
                data-testid="slider-quran-page"
              />
            </div>
            <div>
              <Label>Current Surah (1-114)</Label>
              <Input
                type="number"
                min={1} max={114}
                defaultValue={quran?.currentSurah ?? 1}
                onBlur={(e) =>
                  updateQuran.mutate(
                    { data: { currentSurah: parseInt(e.target.value) || 1 } },
                    { onSuccess: invalidateQuran }
                  )
                }
                data-testid="input-update-surah"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQuranUpdate(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
