/**
 * app/dashboard/masjids/[id]/settings/page.tsx
 *
 * Prayer times calculation now uses the same timezone-aware method as
 * PublicMasjidPage — moment-timezone + masjid's IANA timezone from
 * /api/timezone, so times are always correct regardless of device timezone.
 *
 * All save/update/delete actions across tabs now show a success
 * confirmation banner (auto-dismiss + manual dismiss), in addition to
 * the existing error banners.
 *
 * Facility tab now validates the required "Languages" field on the client
 * before submitting, showing an inline error under the field instead of
 * only surfacing a generic "Validation failed." banner after a failed
 * round-trip to the server.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import moment from "moment-timezone";
import * as adhan from "adhan";
import {
  Building2,
  Camera,
  ChevronLeft,
  Clock,
  Globe,
  ImageIcon,
  Loader2,
  Music2,
  Pencil,
  Play,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasjids } from "@/hooks/useMasjids";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { useAdhanList } from "@/hooks/useAdhanList";
import { useAdhanPreferenceByMasjid } from "@/hooks/useAdhanPreference";
import type { FacilityRequest, AllowedService, FacilityAmenities } from "@/types/media";
import type { Mosque } from "@/types/masjid";
import type { AdhanFile, AdhanPreference } from "@/types/adhan";

// ─────────────────────────────────────────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "general",      label: "General",      icon: Settings2  },
  { key: "facility",     label: "Facility",     icon: Building2  },
  { key: "cover",        label: "Cover Photo",  icon: Camera     },
  { key: "gallery",      label: "Gallery",      icon: ImageIcon  },
  { key: "prayer-times", label: "Prayer Times", icon: Globe      },
  { key: "adhan",        label: "Adhan",        icon: Music2     },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─────────────────────────────────────────────────────────────────────────────
// Prayer-time types
// ─────────────────────────────────────────────────────────────────────────────

interface PrayerAdjustments {
  fajr: number;
  sunrise?: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

interface PrayerTimesConfiguration {
  method: string;
  fajr_angle: number;
  isha_angle: number;
  isha_interval: number;
  asr_method: string;
  high_latitude_rule: string;
  adjustments: PrayerAdjustments;
  name?: string;
}

interface PrayerTimesMap {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ★  Core calculation helpers (same as PublicMasjidPage)
// ─────────────────────────────────────────────────────────────────────────────

const getAdhanMethod = (method: string) => {
  switch (method) {
    case "MUSLIM_WORLD_LEAGUE":     return adhan.CalculationMethod.MuslimWorldLeague();
    case "EGYPTIAN":                return adhan.CalculationMethod.Egyptian();
    case "KARACHI":                 return adhan.CalculationMethod.Karachi();
    case "UMM_AL_QURA":            return adhan.CalculationMethod.UmmAlQura();
    case "DUBAI":                   return adhan.CalculationMethod.Dubai();
    case "MOON_SIGHTING_COMMITTEE": return adhan.CalculationMethod.MoonsightingCommittee();
    case "NORTH_AMERICA":           return adhan.CalculationMethod.NorthAmerica();
    case "KUWAIT":                  return adhan.CalculationMethod.Kuwait();
    case "QATAR":                   return adhan.CalculationMethod.Qatar();
    case "SINGAPORE":               return adhan.CalculationMethod.Singapore();
    default:                        return adhan.CalculationMethod.MuslimWorldLeague();
  }
};

const getHighLatitudeRule = (rule?: string) => {
  switch (rule) {
    case "MIDDLE_OF_THE_NIGHT":  return adhan.HighLatitudeRule.MiddleOfTheNight;
    case "SEVENTH_OF_THE_NIGHT": return adhan.HighLatitudeRule.SeventhOfTheNight;
    case "TWILIGHT_ANGLE":       return adhan.HighLatitudeRule.TwilightAngle;
    default:                     return adhan.HighLatitudeRule.MiddleOfTheNight;
  }
};

/** Build prayer times in the masjid's local timezone. */
const buildPrayerTimes = (
  cfg: PrayerTimesConfiguration,
  lat: number,
  lng: number,
  masjidTz: string
): PrayerTimesMap => {
  const params = getAdhanMethod(cfg.method);
  if (cfg.fajr_angle)        params.fajrAngle    = cfg.fajr_angle;
  if (cfg.isha_angle)        params.ishaAngle    = cfg.isha_angle;
  if (cfg.isha_interval > 0) params.ishaInterval = cfg.isha_interval;
  params.highLatitudeRule = getHighLatitudeRule(cfg.high_latitude_rule);

  const masjidNow  = moment().tz(masjidTz);
  const masjidDate = new Date(masjidNow.year(), masjidNow.month(), masjidNow.date());

  const prayers = new adhan.PrayerTimes(
    new adhan.Coordinates(lat, lng),
    masjidDate,
    params
  );
  const adj = cfg.adjustments ?? {};

  const fmt = (d: Date, adjMin: number) =>
    moment(d).tz(masjidTz).add(adjMin, "minutes").format("HH:mm");

  return {
    Fajr:    fmt(prayers.fajr,    adj.fajr    ?? 0),
    Dhuhr:   fmt(prayers.dhuhr,   adj.dhuhr   ?? 0),
    Asr:     fmt(prayers.asr,     adj.asr     ?? 0),
    Maghrib: fmt(prayers.maghrib, adj.maghrib ?? 0),
    Isha:    fmt(prayers.isha,    adj.isha    ?? 0),
  };
};

/** Determine next upcoming prayer in the masjid's timezone. */
const getNextPrayer = (
  pt: PrayerTimesMap,
  masjidTz: string
): { name: keyof PrayerTimesMap; timeUntil: string } => {
  const now = moment().tz(masjidTz);
  const cur = now.hours() * 60 + now.minutes();
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

  let nextName: keyof PrayerTimesMap = "Fajr";
  let minDiff = Infinity;

  for (const p of prayers) {
    const [h, m] = pt[p].split(":").map(Number);
    const diff = h * 60 + m - cur;
    if (diff > 0 && diff < minDiff) { minDiff = diff; nextName = p; }
  }

  if (minDiff === Infinity) {
    nextName = "Fajr";
    const [fh, fm] = pt["Fajr"].split(":").map(Number);
    minDiff = 24 * 60 - cur + fh * 60 + fm;
  }

  const h = Math.floor(minDiff / 60);
  const m = minDiff % 60;
  return { name: nextName, timeUntil: h > 0 ? `${h}h ${m}m` : `${m}m` };
};

/** Fetch IANA timezone from /api/timezone (same as PublicMasjidPage). */
async function fetchTimezone(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/timezone?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const tz: string = data?.tz_name ?? "";
    if (tz && !tz.startsWith("Etc/") && !tz.startsWith("GMT") && !tz.startsWith("UTC")) return tz;
    throw new Error(`non-IANA: ${tz}`);
  } catch {
    const offsetHours = Math.round(lng / 15);
    const sign = offsetHours >= 0 ? "-" : "+";
    return `Etc/GMT${sign}${Math.abs(offsetHours)}`;
  }
}

function tzAbbr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

// ─────────────────────────────────────────────────────────────────────────────
// Success confirmation helper (shared across all tabs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shows a success message for a few seconds, then auto-dismisses.
 * Used to confirm that a save/update/delete action completed, since
 * these mutations previously had no visible feedback beyond a silent
 * background refetch.
 */
function useSuccessMessage(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);

  function show(msg: string) {
    setMessage(msg);
  }

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs]);

  return { message, show, clear: () => setMessage(null) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MasjidSettingsPage() {
  const params       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const masjidId     = params.id;

  const activeTab = (searchParams.get("tab") as TabKey) ?? "general";

  const { getMasjid } = useMasjids();
  const media = useMasjidMedia();

  const [masjid, setMasjid]               = useState<Mosque | undefined>(undefined);
  const [isLoadingMasjid, setIsLoadingMasjid] = useState(true);

  useEffect(() => {
    if (!masjidId) return;
    setIsLoadingMasjid(true);
    getMasjid(masjidId)
      .then(setMasjid)
      .catch(() => setMasjid(undefined))
      .finally(() => setIsLoadingMasjid(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjidId]);

  useEffect(() => {
    if (!masjidId) return;
    if (activeTab === "cover")    media.getCoverPhoto(masjidId);
    if (activeTab === "gallery")  media.getGallery(masjidId);
    if (activeTab === "facility") media.getFacility(masjidId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, masjidId]);

  function setTab(key: TabKey) {
    router.push(`/dashboard/masjids/${masjidId}/settings?tab=${key}`);
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      {/* Header */}
      <div className="bg-white border-b border-[#eaedff] px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/masjid-management")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#131b2e] transition-colors">
          <ChevronLeft size={16} /> Masjids
        </button>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-semibold text-[#131b2e] truncate max-w-xs">
          {isLoadingMasjid ? "Loading…" : (masjid?.name ?? "Unknown Masjid")}
        </h1>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500">Settings</span>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-[#eaedff] px-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              data-testid={`tab-${key}`}
              aria-current={activeTab === key ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === key
                  ? "border-[#4f5af5] text-[#4f5af5]"
                  : "border-transparent text-slate-500 hover:text-[#131b2e] hover:border-slate-200"
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {activeTab === "general"      && <GeneralTab masjid={masjid} />}
        {activeTab === "facility"     && <FacilityTab masjidId={masjidId} media={media} />}
        {activeTab === "cover"        && <CoverPhotoTab masjidId={masjidId} media={media} onUploadSuccess={() => {}} />}
        {activeTab === "gallery"      && <GalleryTab masjidId={masjidId} media={media} onUploadSuccess={() => {}} />}
        {activeTab === "prayer-times" && <PrayerTimesTab masjid={masjid} isLoading={isLoadingMasjid} />}
        {activeTab === "adhan"        && <AdhanTab masjidId={masjidId} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL TAB
// ─────────────────────────────────────────────────────────────────────────────

function GeneralTab({ masjid }: { masjid: Mosque | undefined }) {
  return (
    <Card title="General Information">
      <div className="space-y-4">
        <InfoRow label="Name"       value={masjid?.name} />
        <InfoRow label="Subdomain"  value={masjid?.subDomain ? `${masjid.subDomain}.masjids.io` : undefined} />
        <InfoRow label="Location"   value={masjid?.location} />
        <InfoRow label="Country"    value={masjid?.countryCode} />
        <InfoRow label="Public Page" value={
          masjid?.subDomain ? (
            <a href={`https://${masjid.subDomain}.masjids.io`} target="_blank" rel="noopener noreferrer" className="text-[#4f5af5] hover:underline">
              Visit ↗
            </a>
          ) : undefined
        } />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ★  PRAYER TIMES TAB
// ─────────────────────────────────────────────────────────────────────────────

function PrayerTimesTab({
  masjid,
  isLoading,
}: {
  masjid: Mosque | undefined;
  isLoading: boolean;
}) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesMap | null>(null);
  const [nextInfo, setNextInfo]       = useState<{ name: keyof PrayerTimesMap; timeUntil: string } | null>(null);
  const [calcError, setCalcError]     = useState<string | null>(null);
  const [masjidTz, setMasjidTz]       = useState<string | null>((masjid as any)?.timezone ?? null);
  const [tzLoading, setTzLoading]     = useState(false);
  const [nowUtc, setNowUtc]           = useState(() => new Date());

  const cfg = masjid?.prayer_times_configuration as PrayerTimesConfiguration | undefined;
  const adj = cfg?.adjustments;
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!masjid || masjidTz) return;
    const lat = Number(masjid.latitude), lng = Number(masjid.longitude);
    if (!lat && !lng) return;
    setTzLoading(true);
    fetchTimezone(lat, lng)
      .then(setMasjidTz)
      .finally(() => setTzLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid?.latitude, masjid?.longitude]);

  useEffect(() => {
    if (!cfg || !masjidTz) return;
    try {
      const pt = buildPrayerTimes(cfg, Number(masjid!.latitude), Number(masjid!.longitude), masjidTz);
      setPrayerTimes(pt);
      setNextInfo(getNextPrayer(pt, masjidTz));
      setCalcError(null);
    } catch (e: any) {
      setCalcError(e?.message ?? "Calculation failed.");
    }
  }, [masjid, masjidTz]);

  useEffect(() => {
    const t = setInterval(() => {
      setNowUtc(new Date());
      if (prayerTimes && masjidTz) setNextInfo(getNextPrayer(prayerTimes, masjidTz));
    }, 1000);
    return () => clearInterval(t);
  }, [prayerTimes, masjidTz]);

  if (isLoading) return <Spinner />;

  if (!masjid) {
    return (
      <Card title="Prayer Times">
        <p className="text-sm text-slate-400">Masjid data not available.</p>
      </Card>
    );
  }

  if (tzLoading || !masjidTz) {
    return (
      <Card title="Prayer Times">
        <div className="flex items-center gap-3 py-8 justify-center">
          <Loader2 size={18} className="animate-spin text-[#4f5af5]" />
          <span className="text-sm text-slate-400">Resolving masjid timezone…</span>
        </div>
      </Card>
    );
  }

  const isSameZone = userTz === masjidTz;
  const masjidTimeStr = nowUtc.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    timeZone: masjidTz,
  });
  const masjidDateLabel = nowUtc.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: masjidTz,
  });

  const PRAYER_NAMES: (keyof PrayerTimesMap)[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  return (
    <div className="space-y-4">
      <Card title="Prayer Times">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 bg-[#f2f3ff] border border-[#eaedff] rounded-xl px-4 py-2.5">
            <div className="w-7 h-7 bg-[#4f5af5] rounded-lg flex items-center justify-center shrink-0">
              <Clock size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#4f5af5]/60">
                Masjid Time ({tzAbbr(masjidTz)})
              </p>
              <p className="text-sm font-bold text-[#131b2e] tabular-nums font-mono">
                {masjidTimeStr}
              </p>
            </div>
          </div>

          {!isSameZone && (
            <div className="flex items-center gap-2 bg-slate-50 border border-[#eaedff] rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                <Clock size={13} className="text-slate-500" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Your Time ({tzAbbr(userTz)})
                </p>
                <p className="text-sm font-bold text-slate-600 tabular-nums font-mono">
                  {nowUtc.toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                    hour12: false, timeZone: userTz,
                  })}
                </p>
              </div>
            </div>
          )}

          {nextInfo && (
            <div className="ml-auto self-center flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-800">
                {nextInfo.name} in {nextInfo.timeUntil}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mb-5 -mt-1">
          {masjidDateLabel}
          {!isSameZone && (
            <span className="ml-1 text-amber-500 font-semibold">
              · Shown in masjid&apos;s local time
            </span>
          )}
        </p>

        {calcError && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {calcError}
          </div>
        )}

        {!prayerTimes && !calcError && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#4f5af5]" />
          </div>
        )}

        {prayerTimes && (
          <div className="divide-y divide-[#f2f3ff]">
            {PRAYER_NAMES.map((prayer) => {
              const isNext = nextInfo?.name === prayer;
              const adjVal = adj?.[prayer.toLowerCase() as keyof PrayerAdjustments] ?? 0;
              return (
                <div
                  key={prayer}
                  data-testid={`prayer-row-${prayer.toLowerCase()}`}
                  className={cn(
                    "flex items-center justify-between py-3.5 px-3 rounded-lg transition-colors",
                    isNext && "bg-[#f2f3ff]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isNext ? "bg-[#4f5af5] animate-pulse" : "bg-slate-200"
                    )} />
                    <div>
                      <span className={cn(
                        "text-sm font-medium",
                        isNext ? "text-[#4f5af5]" : "text-[#131b2e]"
                      )}>
                        {prayer}
                        {isNext && (
                          <span className="ml-2 text-xs font-normal bg-[#4f5af5] text-white px-2 py-0.5 rounded-full">
                            Next
                          </span>
                        )}
                      </span>
                      {adjVal !== 0 && (
                        <p className="text-[10px] text-amber-500 mt-0.5">
                          {adjVal > 0 ? "+" : ""}{adjVal}m adjustment
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm tabular-nums font-mono",
                    isNext ? "font-semibold text-[#4f5af5]" : "text-[#131b2e]"
                  )}>
                    {prayerTimes[prayer]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {cfg && (
        <Card title="Configuration">
          <div className="space-y-3">
            <InfoRow label="Method"        value={(cfg.method ?? "—").replace(/_/g, " ")} />
            <InfoRow label="Asr Method"    value={cfg.asr_method} />
            <InfoRow label="High Latitude" value={cfg.high_latitude_rule?.replace(/_/g, " ").toLowerCase()} />
            <InfoRow label="Fajr Angle"    value={`${cfg.fajr_angle}°`} />
            <InfoRow label="Isha Angle"    value={`${cfg.isha_angle}°`} />
            {(cfg.isha_interval ?? 0) > 0 && (
              <InfoRow label="Isha Interval" value={`${cfg.isha_interval} min`} />
            )}
            <InfoRow label="Timezone"      value={`${masjidTz} (${tzAbbr(masjidTz)})`} />
            <InfoRow label="Coordinates"   value={`${masjid.latitude}, ${masjid.longitude}`} />
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ★  ADHAN TAB
// ─────────────────────────────────────────────────────────────────────────────

function AdhanTab({ masjidId }: { masjidId: string }) {
  const {
    adhanFiles,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useAdhanList({ masjidId });

  const {
    preferences,
    isLoading: prefsLoading,
    error: prefsError,
    refetch: refetchPrefs,
  } = useAdhanPreferenceByMasjid(masjidId);

  const success = useSuccessMessage();

  // The active preference for this masjid (first one, if any)
  const activePreference = preferences[0] ?? null;

  // The adhan file linked by the active preference
  const activeFile = activePreference
    ? adhanFiles.find((f) => f.id === activePreference.adhan_file_id) ?? null
    : null;

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function handlePlay(file: AdhanFile) {
    if (playingId === file.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(file.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(file.id);
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));
      formData.append("masjid_id", masjidId);

      const res = await fetch("/api/adhan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? `Upload failed (${res.status})`);
      }

      refetchFiles();
      success.show("Adhan file uploaded.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this adhan file?")) return;

    try {
      const res = await fetch(`/api/adhan/${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? `Delete failed (${res.status})`);
      }
      if (playingId === fileId) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      refetchFiles();
      refetchPrefs();
      success.show("Adhan file deleted.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleSetActive(fileId: string) {
    try {
      if (activePreference) {
        // Update existing preference
        const res = await fetch(`/api/adhan/preference/${activePreference.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adhan_file_id: fileId }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message ?? "Failed to update preference.");
        }
      } else {
        // Create new preference
        const res = await fetch("/api/adhan/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adhan_file_id: fileId,
            prayer_times_configuration: {
              name: "Default",
              method: "MUSLIM_WORLD_LEAGUE",
              asr_method: "SHAFI_HANBALI_MALIKI",
              high_latitude_rule: "MIDDLE_OF_THE_NIGHT",
              adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
            },
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message ?? "Failed to create preference.");
        }
      }
      refetchPrefs();
      success.show("Active adhan updated.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to set active adhan.");
    }
  }

  const isLoading = filesLoading || prefsLoading;

  return (
    <div className="space-y-4">

      {/* ── Active Adhan Card ── */}
      <Card title="Active Adhan">
        {prefsError && prefsError !== "unauthenticated" && (
          <ErrorBanner message={prefsError} onDismiss={refetchPrefs} />
        )}
        {success.message && <SuccessBanner message={success.message} onDismiss={success.clear} />}

        {prefsLoading ? (
          <Spinner />
        ) : activeFile ? (
          <div className="flex items-center gap-4 p-4 bg-[#f2f3ff] border border-[#eaedff] rounded-xl" data-testid="active-adhan-card">
            {/* Play button */}
            <button
              onClick={() => handlePlay(activeFile)}
              data-testid="active-adhan-play-btn"
              aria-label={playingId === activeFile.id ? "Stop preview" : "Play preview"}
              className="w-10 h-10 rounded-full bg-[#4f5af5] text-white flex items-center justify-center shrink-0 hover:bg-[#3f4ad5] transition-colors"
            >
              {playingId === activeFile.id
                ? <span className="w-3 h-3 border-2 border-white rounded-sm" />
                : <Play size={14} className="ml-0.5" />
              }
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#131b2e] truncate">{activeFile.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Currently active · set {new Date(activePreference!.updated_at).toLocaleDateString()}
              </p>
            </div>

            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              Active
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-5 px-4 bg-slate-50 border border-dashed border-[#eaedff] rounded-xl">
            <Music2 size={18} className="text-slate-300 shrink-0" />
            <p className="text-sm text-slate-400">
              No active adhan set. Upload a file below and select it as active.
            </p>
          </div>
        )}

        {/* Preference config summary */}
        {activePreference && (
          <div className="mt-4 pt-4 border-t border-[#f2f3ff] space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Prayer Times Configuration
            </p>
            <InfoRow
              label="Method"
              value={activePreference.prayer_times_configuration.method.replace(/_/g, " ")}
            />
            <InfoRow
              label="Asr Method"
              value={activePreference.prayer_times_configuration.asr_method.replace(/_/g, " ")}
            />
            <InfoRow
              label="High Latitude"
              value={activePreference.prayer_times_configuration.high_latitude_rule.replace(/_/g, " ").toLowerCase()}
            />
            <InfoRow
              label="Adjustments"
              value={
                <span className="font-mono text-xs">
                  {Object.entries(activePreference.prayer_times_configuration.adjustments)
                    .map(([k, v]) => `${k[0].toUpperCase()}${v > 0 ? "+" : ""}${v}`)
                    .join(" · ")}
                </span>
              }
            />
          </div>
        )}
      </Card>

      {/* ── Adhan Files Card ── */}
      <Card title="Adhan Files">
        {uploadError && (
          <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />
        )}
        {filesError && filesError !== "unauthenticated" && (
          <ErrorBanner message={filesError} onDismiss={refetchFiles} />
        )}

        {/* Upload button row */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">
            {filesLoading ? "Loading…" : `${(adhanFiles ?? []).length} file${(adhanFiles ?? []).length !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading || isLoading}
            data-testid="adhan-upload-btn"
            className="flex items-center gap-2 bg-[#4f5af5] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#3f4ad5] disabled:opacity-50 transition-colors"
          >
            {isUploading
              ? <Loader2 size={14} className="animate-spin" />
              : <Upload size={14} />
            }
            Upload Adhan
          </button>
        </div>

        {/* File list */}
        {isLoading && (adhanFiles ?? []).length === 0 ? (
          <Spinner />
        ) : (adhanFiles ?? []).length === 0 ? (
          <DropZone
            loading={isUploading}
            onClick={() => fileRef.current?.click()}
            label="No adhan files yet"
            hint="Upload an MP3 or audio file to get started"
          />
        ) : (
          <div className="divide-y divide-[#f2f3ff]">
            {(adhanFiles ?? []).map((file) => {
              const isActive = file.id === activePreference?.adhan_file_id;
              const isPlaying = playingId === file.id;

              return (
                <div
                  key={file.id}
                  data-testid={`adhan-file-row-${file.id}`}
                  className={cn(
                    "flex items-center gap-3 py-3.5 px-3 rounded-lg transition-colors group",
                    isActive && "bg-[#f2f3ff]"
                  )}
                >
                  {/* Play / stop button */}
                  <button
                    onClick={() => handlePlay(file)}
                    data-testid={`adhan-play-btn-${file.id}`}
                    aria-label={isPlaying ? `Stop ${file.name}` : `Play ${file.name}`}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isPlaying
                        ? "bg-[#4f5af5] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-[#4f5af5] hover:text-white"
                    )}
                  >
                    {isPlaying
                      ? <span className="w-2.5 h-2.5 border-[1.5px] border-white rounded-sm" />
                      : <Play size={11} className="ml-0.5" />
                    }
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-[#4f5af5]" : "text-[#131b2e]"
                    )}>
                      {file.name}
                      {isActive && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full align-middle">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Added {new Date(file.created_at).toLocaleDateString()}
                      {file.updated_at && ` · Updated ${new Date(file.updated_at).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(file.id)}
                        title="Set as active"
                        data-testid={`adhan-set-active-btn-${file.id}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#4f5af5] bg-[#f2f3ff] rounded-lg hover:bg-[#e8eaff] transition-colors"
                      >
                        <Pencil size={11} /> Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(file.id)}
                      title="Delete"
                      data-testid={`adhan-delete-btn-${file.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleUpload}
          data-testid="adhan-file-input"
        />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FACILITY TAB
// ─────────────────────────────────────────────────────────────────────────────

function FacilityTab({ masjidId, media }: { masjidId: string; media: ReturnType<typeof useMasjidMedia> }) {
  const existing = media.facility?.data;
  const success = useSuccessMessage();

  const DEFAULT_AMENITIES: FacilityAmenities = {
    parking: false, wheelchair_accessible: false, womens_section: false,
    ablution_facilities: false, library: false, classroom: false, funeral_services: false,
  };

  const [form, setForm] = useState<FacilityRequest>({
    capacity: { main_hall: 0, womens_section: 0, total: 0 },
    services: [],
    languages: [],
    amenities: DEFAULT_AMENITIES,
  });

  // ★ Client-side field validation errors, keyed by field name.
  // Populated before the API call so the user gets instant feedback
  // instead of waiting for a round-trip that only returns a generic banner.
  // The backend requires capacity, services, and languages to all be
  // filled in (non-empty arrays / non-zero capacity), so every field in
  // this form is effectively required.
  const [fieldErrors, setFieldErrors] = useState<{
    capacity?: string;
    services?: string;
    languages?: string;
  }>({});

  useEffect(() => {
    if (existing) {
      const main_hall = existing.capacity?.main_hall ?? 0;
      const womens_section = existing.capacity?.womens_section ?? 0;
      setForm({
        capacity: {
          main_hall,
          womens_section,
          total: main_hall + womens_section, // ★ always derived, ignore server's stored total
        },
        services: (existing.services ?? []) as AllowedService[],
        languages: existing.languages ?? [],
        amenities: existing.amenities ?? DEFAULT_AMENITIES,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const isNew = !existing;
  const languagesRef = useRef<HTMLInputElement>(null);
  const capacityRef  = useRef<HTMLInputElement>(null);
  const servicesRef  = useRef<HTMLDivElement>(null);

  function validate(): boolean {
    const errors: { capacity?: string; services?: string; languages?: string } = {};

    if (form.capacity.main_hall <= 0 || form.capacity.total <= 0) {
      errors.capacity = "Enter the facility's capacity (main hall and total).";
    }
    if (form.services.length === 0) {
      errors.services = "Select at least one service.";
    }
    if (form.languages.length === 0) {
      errors.languages = "Add at least one language before saving.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) {
      // Focus/scroll to the first offending field, top to bottom
      if (form.capacity.main_hall <= 0 || form.capacity.total <= 0) {
        capacityRef.current?.focus();
      } else if (form.services.length === 0) {
        servicesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        languagesRef.current?.focus();
      }
      return;
    }

    const wasNew = isNew;
    const result = wasNew
      ? await media.createFacility(masjidId, form)
      : await media.updateFacility(masjidId, form);
    if (result) {
      success.show(wasNew ? "Facility information created." : "Facility information saved.");
    }
  }

  function updateLanguages(v: string[]) {
    setForm((f) => ({ ...f, languages: v }));
    // Clear the inline error as soon as the user adds a language, rather
    // than making them resubmit to find out it's fixed.
    if (v.length > 0 && fieldErrors.languages) {
      setFieldErrors((prev) => ({ ...prev, languages: undefined }));
    }
  }

  function updateServices(v: AllowedService[]) {
    setForm((f) => ({ ...f, services: v }));
    if (v.length > 0 && fieldErrors.services) {
      setFieldErrors((prev) => ({ ...prev, services: undefined }));
    }
  }

  function updateCapacity(key: "main_hall" | "womens_section", value: number) {
    setForm((f) => {
      const nextCapacity = { ...f.capacity, [key]: value };
      // ★ Total is always derived from main_hall + womens_section — never
      // entered manually, so it can't drift out of sync with the two parts.
      nextCapacity.total = nextCapacity.main_hall + nextCapacity.womens_section;
      return { ...f, capacity: nextCapacity };
    });
    if (fieldErrors.capacity) {
      setFieldErrors((prev) => ({ ...prev, capacity: undefined }));
    }
  }

  if (media.loading) return <Spinner />;

  return (
    <Card title="Facility Information">
      {media.error && <ErrorBanner message={media.error} onDismiss={media.clearError} />}
      {success.message && <SuccessBanner message={success.message} onDismiss={success.clear} />}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Capacity
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {(["main_hall", "womens_section"] as const).map((key, i) => (
              <div key={key}>
                <label htmlFor={`capacity-${key}`} className="block text-xs text-slate-500 mb-1 capitalize">{key.replace("_", " ")}</label>
                <input
                  ref={i === 0 ? capacityRef : undefined}
                  id={`capacity-${key}`}
                  data-testid={`capacity-input-${key}`}
                  type="number" min={0} value={form.capacity[key]}
                  onChange={(e) => updateCapacity(key, Number(e.target.value))}
                  aria-invalid={!!fieldErrors.capacity}
                  className={cn(
                    "w-full border rounded-lg px-3 py-2 text-sm text-[#131b2e] focus:outline-none focus:ring-2",
                    fieldErrors.capacity
                      ? "border-red-300 focus:ring-red-200"
                      : "border-[#eaedff] focus:ring-[#4f5af5]/30"
                  )}
                />
              </div>
            ))}
            {/* ★ Total — read-only, always main_hall + womens_section */}
            <div>
              <label htmlFor="capacity-total" className="block text-xs text-slate-500 mb-1">Total</label>
              <input
                id="capacity-total"
                data-testid="capacity-input-total"
                type="number" value={form.capacity.total}
                readOnly
                disabled
                className="w-full border border-[#eaedff] rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
              />
            </div>
          </div>
          {fieldErrors.capacity && (
            <p className="text-xs text-red-500 mt-2" data-testid="capacity-error">
              {fieldErrors.capacity}
            </p>
          )}
        </section>
        <div ref={servicesRef}>
          <ServiceSelector
            values={form.services}
            onChange={updateServices}
            required
            error={fieldErrors.services}
          />
        </div>
        <TagEditor
          inputRef={languagesRef}
          label="Languages"
          required
          values={form.languages}
          onChange={updateLanguages}
          placeholder="e.g. English, Arabic…"
          error={fieldErrors.languages}
        />
        <AmenitiesEditor values={form.amenities} onChange={(v) => setForm((f) => ({ ...f, amenities: v }))} />
        <button type="submit" disabled={media.loading} data-testid="facility-submit-btn" className="flex items-center gap-2 bg-[#4f5af5] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#3f4ad5] disabled:opacity-50 transition-colors">
          {media.loading && <Loader2 size={14} className="animate-spin" />}
          {isNew ? "Create Facility" : "Save Changes"}
        </button>
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER PHOTO TAB
// ─────────────────────────────────────────────────────────────────────────────

function CoverPhotoTab({ masjidId, media, onUploadSuccess }: { masjidId: string; media: ReturnType<typeof useMasjidMedia>; onUploadSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasCover = !!media.coverPhoto?.data?.cover_photo_url;
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const success = useSuccessMessage();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const wasReplacing = hasCover;
    const result = wasReplacing ? await media.updateCoverPhoto(masjidId, file) : await media.uploadCoverPhoto(masjidId, file);
    e.target.value = "";
    if (result) {
      setCacheBust(Date.now());
      await media.getCoverPhoto(masjidId);
      onUploadSuccess();
      success.show(wasReplacing ? "Cover photo replaced." : "Cover photo uploaded.");
    }
  }

  const coverUrl = media.coverPhoto?.data?.cover_photo_url ? `${media.coverPhoto.data.cover_photo_url}?v=${cacheBust}` : undefined;

  return (
    <Card title="Cover Photo">
      {media.error && <ErrorBanner message={media.error} onDismiss={media.clearError} />}
      {success.message && <SuccessBanner message={success.message} onDismiss={success.clear} />}
      {hasCover ? (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Cover photo" className="w-full h-full object-cover" />
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={media.loading} data-testid="replace-cover-btn" className="flex items-center gap-2 border border-[#eaedff] rounded-lg px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] disabled:opacity-50 transition-colors">
            {media.loading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Replace Cover Photo
          </button>
        </div>
      ) : (
        <DropZone loading={media.loading} onClick={() => fileRef.current?.click()} label="Upload a cover photo" hint="JPEG, PNG or WEBP · Max 5 MB" />
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} data-testid="cover-file-input" />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY TAB
// ─────────────────────────────────────────────────────────────────────────────

function GalleryTab({ masjidId, media, onUploadSuccess }: { masjidId: string; media: ReturnType<typeof useMasjidMedia>; onUploadSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = media.gallery?.data ?? [];
  const success = useSuccessMessage();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const result = await media.uploadGalleryPhotos(masjidId, files);
    e.target.value = "";
    if (result) {
      onUploadSuccess();
      success.show(`${files.length} photo${files.length !== 1 ? "s" : ""} uploaded.`);
    }
  }

  return (
    <Card title="Gallery">
      {media.error && <ErrorBanner message={media.error} onDismiss={media.clearError} />}
      {success.message && <SuccessBanner message={success.message} onDismiss={success.clear} />}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
        <button onClick={() => fileRef.current?.click()} disabled={media.loading} data-testid="gallery-upload-btn" className="flex items-center gap-2 bg-[#4f5af5] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#3f4ad5] disabled:opacity-50 transition-colors">
          {media.loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload Photos
        </button>
      </div>
      {photos.length === 0 && !media.loading ? (
        <DropZone loading={false} onClick={() => fileRef.current?.click()} label="No gallery photos yet" hint="Upload up to 10 photos at once · JPEG, PNG or WEBP · Max 5 MB each" />
      ) : (
        <div className="grid grid-cols-3 gap-3" data-testid="gallery-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-slate-100" data-testid={`gallery-photo-${photo.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.photo_url} alt={photo.caption ?? "Gallery photo"} className="w-full h-full object-cover" />
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">{photo.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} data-testid="gallery-file-input" />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eaedff] p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#131b2e] mb-6">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-[#f2f3ff] last:border-0">
      <span className="w-32 text-sm text-slate-400 shrink-0">{label}</span>
      <span className="text-sm text-[#131b2e]">{value ?? <span className="text-slate-300">—</span>}</span>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#4f5af5]" /></div>;
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4" role="alert" data-testid="error-banner">
      <p className="text-sm text-red-600 flex-1">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-red-400 hover:text-red-600"><X size={14} /></button>
    </div>
  );
}

/** Success confirmation banner shown after a save/update/delete action completes. */
function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4"
      role="status"
      aria-live="polite"
      data-testid="success-banner"
    >
      <p className="text-sm text-emerald-700 flex-1">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-emerald-400 hover:text-emerald-600">
        <X size={14} />
      </button>
    </div>
  );
}

function DropZone({ loading, onClick, label, hint }: { loading: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button onClick={onClick} disabled={loading} data-testid="dropzone-btn" className="w-full border-2 border-dashed border-[#eaedff] rounded-xl py-12 flex flex-col items-center gap-3 text-slate-400 hover:border-[#4f5af5] hover:text-[#4f5af5] disabled:opacity-50 transition-colors">
      {loading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs">{hint}</span>
    </button>
  );
}

const ALLOWED_SERVICES: AllowedService[] = [
  "Halal", "Funeral", "Nikah", "Weekend School", "Quran Classes", "Youth Programs",
];

function ServiceSelector({
  values, onChange, required, error,
}: {
  values: AllowedService[];
  onChange: (v: AllowedService[]) => void;
  required?: boolean;
  error?: string;
}) {
  function toggle(service: AllowedService) {
    onChange(values.includes(service) ? values.filter((s) => s !== service) : [...values, service]);
  }
  return (
    <section>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Services
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <div
        className={cn(
          "flex flex-wrap gap-2 p-2 -m-2 rounded-xl border",
          error ? "border-red-200 bg-red-50/40" : "border-transparent"
        )}
      >
        {ALLOWED_SERVICES.map((s) => (
          <button
            key={s} type="button" onClick={() => toggle(s)}
            data-testid={`service-toggle-${s.toLowerCase().replace(/\s+/g, "-")}`}
            aria-pressed={values.includes(s)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", values.includes(s) ? "bg-[#4f5af5] text-white border-[#4f5af5]" : "bg-white text-slate-500 border-[#eaedff] hover:border-[#4f5af5] hover:text-[#4f5af5]")}
          >
            {s}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-2" data-testid="services-error">
          {error}
        </p>
      )}
    </section>
  );
}

const AMENITY_LABELS: Record<keyof FacilityAmenities, string> = {
  parking: "Parking", wheelchair_accessible: "Wheelchair Accessible", womens_section: "Women's Section",
  ablution_facilities: "Ablution Facilities", library: "Library", classroom: "Classroom", funeral_services: "Funeral Services",
};

function AmenitiesEditor({ values, onChange }: { values: FacilityAmenities; onChange: (v: FacilityAmenities) => void }) {
  return (
    <section>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Amenities</label>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(AMENITY_LABELS) as (keyof FacilityAmenities)[]).map((key) => (
          <label key={key} htmlFor={`amenity-${key}`} className="flex items-center gap-3 cursor-pointer select-none">
            <input
              id={`amenity-${key}`}
              data-testid={`amenity-checkbox-${key}`}
              type="checkbox" checked={values[key]}
              onChange={(e) => onChange({ ...values, [key]: e.target.checked })}
              className="w-4 h-4 rounded border-[#eaedff] text-[#4f5af5] accent-[#4f5af5]"
            />
            <span className="text-sm text-[#131b2e]">{AMENITY_LABELS[key]}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

/**
 * ★ TagEditor now supports:
 *   - `required`: shows a red asterisk next to the label
 *   - `error`: renders an inline red message + red input border under the field
 *   - `inputRef`: lets the parent focus the input programmatically on
 *     validation failure (e.g. facility submit with 0 languages)
 */
function TagEditor({
  label, values, onChange, placeholder, required, error, inputRef,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setInput("");
  }
  return (
    <section>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          data-testid="tag-editor-input"
          aria-invalid={!!error}
          aria-describedby={error ? "languages-error" : undefined}
          className={cn(
            "flex-1 border rounded-lg px-3 py-2 text-sm text-[#131b2e] placeholder-slate-300 focus:outline-none focus:ring-2",
            error
              ? "border-red-300 focus:ring-red-200"
              : "border-[#eaedff] focus:ring-[#4f5af5]/30"
          )}
        />
        <button type="button" onClick={add} data-testid="tag-editor-add-btn" className="px-3 py-2 bg-[#f2f3ff] text-[#4f5af5] rounded-lg text-sm font-medium hover:bg-[#e8eaff] transition-colors">Add</button>
      </div>
      {error && (
        <p id="languages-error" className="text-xs text-red-500 mb-2" data-testid="tag-editor-error">
          {error}
        </p>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v: string) => (
            <span key={v} data-testid={`tag-chip-${v}`} className="flex items-center gap-1.5 bg-[#f2f3ff] text-[#4f5af5] text-xs font-medium px-3 py-1 rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x: string) => x !== v))} aria-label={`Remove ${v}`} className="text-[#4f5af5]/60 hover:text-[#4f5af5]"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}