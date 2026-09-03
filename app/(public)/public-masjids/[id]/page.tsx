/**
 * app/(public)/public-masjids/[id]/page.tsx
 *
 * Prayer time calculation now IDENTICAL to MasjidDashboard:
 *   - Uses adhan.CalculationMethod via getAdhanMethod()
 *   - Applies fajr_angle, isha_angle, isha_interval overrides
 *   - Applies per-prayer minute adjustments from cfg.adjustments
 *   - Formats times as "HH:mm" (24-hr) with moment.js
 *   - Determines "next" prayer by comparing HH:mm strings
 *   - Masjid timezone still resolved for the dual-clock banner display
 *     but does NOT affect the prayer time calculation (same as Dashboard)
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import moment from "moment-timezone";
import * as adhan from "adhan";
import {
  MapPin, Phone, Globe, BadgeCheck, Heart, Share2, Users,
  Clock, ChevronRight, Loader2, RefreshCw, Building2,
  BookOpen, CarFront, Accessibility, Baby, Library, School,
  FlameKindling, Wifi, Volume2, X, Music2, Play, Pause,
} from "lucide-react";
import { useMasjids } from "@/hooks/useMasjids";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { useFollowers } from "@/hooks/followers/useFollowers";
import { useAdhanList } from "@/hooks/useAdhanList";
import type { Mosque } from "@/types/masjid";
import type { AdhanFile } from "@/types/adhan";

// ─────────────────────────────────────────────────────────────────────────────
// Types  (matches Dashboard's PrayerTimesConfiguration shape)
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
// ★  CORE: identical helpers to MasjidDashboard
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

/**
 * ★ Build prayer times using the MASJID's local date & timezone.
 *
 * Why this matters:
 *   adhan.PrayerTimes() outputs UTC Date objects.
 *   moment(d).format("HH:mm") uses the DEVICE's timezone — wrong if the
 *   device is in a different zone than the masjid.
 *   We must format each UTC Date as "HH:mm" in the MASJID's timezone.
 *
 * Also: we pass the masjid's local *calendar date* (not new Date()) so that
 *   a user in GMT+8 viewing a masjid in GMT-5 at 10 AM gets the masjid's
 *   today (still "yesterday" for them), not tomorrow's times.
 */
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

  // Use TODAY at the MASJID's location (not the device's local date)
  const masjidNow   = moment().tz(masjidTz);
  const masjidDate  = new Date(masjidNow.year(), masjidNow.month(), masjidNow.date());

  const prayers = new adhan.PrayerTimes(
    new adhan.Coordinates(lat, lng),
    masjidDate,
    params
  );
  const adj = cfg.adjustments ?? {};

  // Format each UTC Date into "HH:mm" as seen at the MASJID
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

/**
 * ★ Next-prayer logic — compares against the MASJID's current local time.
 */
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
    // All prayers passed today — wrap to Fajr tomorrow
    nextName = "Fajr";
    const [fh, fm] = pt["Fajr"].split(":").map(Number);
    minDiff = 24 * 60 - cur + fh * 60 + fm;
  }

  const h = Math.floor(minDiff / 60);
  const m = minDiff % 60;
  return {
    name: nextName,
    timeUntil: h > 0 ? `${h}h ${m}m` : `${m}m`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Timezone helpers  (used ONLY for the dual-clock display banner)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTimezone(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/timezone?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const data = await res.json();

    // Accept any IANA-style name (e.g. "America/New_York", "Asia/Jakarta")
    // Reject offset-only strings like "GMT-5" or "UTC+8" — they are NOT DST-aware
    const tz: string = data?.tz_name ?? data?.timezone ?? data?.timeZone ?? "";
    if (tz && !tz.startsWith("Etc/") && !tz.startsWith("GMT") && !tz.startsWith("UTC")) {
      return tz;
    }
    throw new Error(`non-IANA tz: ${tz}`);
  } catch (err) {
    // ⚠️  Fallback: Etc/GMT offsets are NOT DST-aware.
    // This will be wrong by 1 hour during DST (e.g. New York summer).
    // Fix: ensure /api/timezone returns a proper IANA name like "America/New_York".
    console.warn("[fetchTimezone] falling back to static offset — DST will be wrong!", err);
    const offsetHours = Math.round(lng / 15);
    const sign = offsetHours >= 0 ? "-" : "+"; // Etc/GMT sign is inverted
    return `Etc/GMT${sign}${Math.abs(offsetHours)}`;
  }
}

function fmtInZone(d: Date, tz: string) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: tz, timeZoneName: "short",
  });
}

function tzAbbr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility / constants
// ─────────────────────────────────────────────────────────────────────────────

function cn(...c: (string | boolean | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

const PLACEHOLDER = "/images/masjid-cover.png";

// ★ Height of the global site navbar (Platform · Solutions · Masjids · Pricing ·
// Dashboard). The sub-nav below is offset by this amount so the two bars stack
// instead of overlapping when the page is scrolled. Adjust this if the global
// navbar's actual height changes.
const GLOBAL_NAVBAR_HEIGHT_PX = 64;

const AMENITY_ICONS: Record<string, React.ElementType> = {
  parking: CarFront,
  wheelchair_accessible: Accessibility,
  womens_section: Baby,
  ablution_facilities: Volume2,
  library: Library,
  classroom: School,
  funeral_services: FlameKindling,
};

const AMENITY_LABELS: Record<string, string> = {
  parking: "Parking",
  wheelchair_accessible: "Wheelchair Accessible",
  womens_section: "Women's Section",
  ablution_facilities: "Ablution Facilities",
  library: "Library",
  classroom: "Classroom",
  funeral_services: "Funeral Services",
};

const NAV_ITEMS = [
  { href: "overview",  label: "Overview" },
  { href: "donations",  label: "Donations" },
  { href: "memberships", label: "Memberships" },
  { href: "news",      label: "News" },
  { href: "elections", label: "Elections" },
  { href: "donation",  label: "Donate", isDonate: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// MapEmbed
// ─────────────────────────────────────────────────────────────────────────────

function MapEmbed({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, { center: [lat, lng], zoom: 15, zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;background:#003527;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>`,
        iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -38],
      });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<div style="font-family:Manrope,sans-serif;font-weight:700;color:#003527;font-size:13px;padding:2px 4px">${name}</div>`, { closeButton: false }).openPopup();
    });

    return () => {
      if (mapInstanceRef.current) { (mapInstanceRef.current as { remove: () => void }).remove(); mapInstanceRef.current = null; }
    };
  }, [lat, lng, name]);

  return <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-100" style={{ height: 220, zIndex: 0 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm p-7", className)}>
      {title && <h2 className="text-xl font-bold text-[#003527] mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>{title}</h2>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ★  PrayerTimesSection  — now uses buildPrayerTimes() like the Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function PrayerTimesSection({ masjid }: { masjid: Mosque }) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesMap | null>(null);
  const [nextInfo, setNextInfo] = useState<{ name: keyof PrayerTimesMap; timeUntil: string } | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(moment().format("HH:mm:ss"));

  // For display banner only
  const [masjidTz, setMasjidTz] = useState<string | null>((masjid as any).timezone ?? null);
  const [nowUtc, setNowUtc] = useState(() => new Date());
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const cfg = masjid.prayer_times_configuration as PrayerTimesConfiguration | undefined;
  const adj = cfg?.adjustments;

  // ── Build prayer times — wait for masjidTz first ────────────────────────
  useEffect(() => {
    if (!cfg || !masjidTz) return;
    try {
      const lat = Number(masjid.latitude);
      const lng = Number(masjid.longitude);
      const pt = buildPrayerTimes(cfg, lat, lng, masjidTz);
      setPrayerTimes(pt);
      setNextInfo(getNextPrayer(pt, masjidTz));
      setCalcError(null);
    } catch (e: any) {
      setCalcError(e?.message ?? "Calculation failed.");
    }
  }, [masjid, masjidTz]);

  // ── Clock tick — update time + re-evaluate next prayer every second ──────
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(moment().tz(masjidTz ?? "UTC").format("HH:mm:ss"));
      setNowUtc(new Date());
      if (prayerTimes && masjidTz) setNextInfo(getNextPrayer(prayerTimes, masjidTz));
    }, 1000);
    return () => clearInterval(t);
  }, [prayerTimes, masjidTz]);

  // ── Fetch timezone for display banner ────────────────────────────────────
  useEffect(() => {
    if (masjidTz) return;
    const lat = Number(masjid.latitude), lng = Number(masjid.longitude);
    if (!lat && !lng) return;
    fetchTimezone(lat, lng).then(setMasjidTz);
  }, [masjid.latitude, masjid.longitude]);

  const isSameZone = masjidTz ? userTz === masjidTz : false;

  if (!cfg) {
    return (
      <SectionCard title="Prayer Times">
        <p className="text-sm text-slate-400 py-6 text-center">No prayer configuration available for this masjid.</p>
      </SectionCard>
    );
  }

  // Wait for timezone before showing times (prevents wrong-zone flash)
  if (!masjidTz) {
    return (
      <SectionCard title="Prayer Times">
        <div className="flex items-center justify-center py-10 gap-3">
          <Loader2 size={20} className="animate-spin text-[#003527]" />
          <span className="text-sm text-slate-400">Resolving masjid timezone…</span>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Prayer Times">

      {/* ── Dual clock banner ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Current time (live clock) */}
        <div className="flex items-center gap-2 bg-[#003527]/5 border border-[#003527]/10 rounded-xl px-4 py-2.5">
          <div className="w-7 h-7 bg-[#003527] rounded-lg flex items-center justify-center shrink-0">
            <Clock size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#003527]/50">
              {masjidTz ? `Masjid Time (${tzAbbr(masjidTz)})` : "Current Time"}
            </p>
            <p className="text-sm font-bold text-[#003527] tabular-nums font-mono">
              {masjidTz ? fmtInZone(nowUtc, masjidTz) : currentTime}
            </p>
          </div>
        </div>

        {/* User local time — only if different timezone */}
        {masjidTz && !isSameZone && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
            <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
              <Clock size={13} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Your Time ({tzAbbr(userTz)})
              </p>
              <p className="text-sm font-bold text-slate-600 tabular-nums font-mono">
                {fmtInZone(nowUtc, userTz)}
              </p>
            </div>
          </div>
        )}

        {/* Next prayer pill */}
        {nextInfo && (
          <div className="ml-auto self-center flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-800">
              {nextInfo.name} in {nextInfo.timeUntil}
            </span>
          </div>
        )}

        {/* Method badge */}
        <span className="self-center text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full">
          {(cfg.name ?? cfg.method).replace(/_/g, " ")}
        </span>
      </div>

      {calcError && (
        <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {calcError}
        </div>
      )}

      {!prayerTimes && !calcError && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-[#003527]" />
        </div>
      )}

      {prayerTimes && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.entries(prayerTimes) as [keyof PrayerTimesMap, string][]).map(([prayer, time]) => {
            const isNext = nextInfo?.name === prayer;
            const adjVal = adj?.[prayer.toLowerCase() as keyof PrayerAdjustments] ?? 0;

            return (
              <div
                key={prayer}
                className={cn(
                  "relative rounded-xl p-4 text-center transition-all",
                  isNext
                    ? "bg-[#003527] text-white shadow-lg shadow-emerald-900/20 ring-2 ring-emerald-400/40"
                    : "bg-slate-50 border border-slate-100"
                )}
              >
                {isNext && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-400 text-[#003527] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                    Next
                  </span>
                )}
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mb-1.5",
                  isNext ? "text-emerald-300" : "text-slate-400"
                )}>
                  {prayer}
                </p>
                <p className={cn(
                  "text-base font-bold tabular-nums font-mono",
                  isNext ? "text-white" : "text-[#003527]"
                )}>
                  {time}
                </p>
                {adjVal !== 0 && (
                  <p className={cn(
                    "text-[10px] mt-1",
                    isNext ? "text-emerald-300" : "text-amber-500"
                  )}>
                    {adjVal > 0 ? "+" : ""}{adjVal}m
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: same as Dashboard card footer */}
      {cfg && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-400">
          <span>
            <span className="font-semibold text-slate-500">Method:</span>{" "}
            {(cfg.method ?? "CUSTOM").replace(/_/g, " ")}
          </span>
          {cfg.fajr_angle > 0 && (
            <span><span className="font-semibold text-slate-500">Fajr:</span> {cfg.fajr_angle}°</span>
          )}
          {cfg.isha_angle > 0 && (
            <span><span className="font-semibold text-slate-500">Isha:</span> {cfg.isha_angle}°</span>
          )}
          {cfg.isha_interval > 0 && (
            <span><span className="font-semibold text-slate-500">Isha interval:</span> {cfg.isha_interval}m</span>
          )}
          <span>
            <span className="font-semibold text-slate-500">High-lat:</span>{" "}
            {(cfg.high_latitude_rule ?? "").replace(/_/g, " ").toLowerCase() || "—"}
          </span>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FacilitySection  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function FacilitySection({ media }: { media: ReturnType<typeof useMasjidMedia> }) {
  const fac = media.facility?.data;
  if (media.loading) {
    return (
      <SectionCard title="Facilities & Services">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      </SectionCard>
    );
  }
  if (!fac) return null;
  const amenityKeys = Object.keys(AMENITY_LABELS).filter((k) => fac.amenities?.[k as keyof typeof fac.amenities]);
  return (
    <SectionCard title="Facilities & Services">
      {fac.capacity && (
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { label: "Main Hall",       val: fac.capacity.main_hall },
            { label: "Women's Section", val: fac.capacity.womens_section },
            { label: "Total Capacity",  val: fac.capacity.total },
          ].map(({ label, val }) => (
            <div key={label} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>{val?.toLocaleString() ?? "—"}</p>
              <p className="text-[11px] font-semibold text-emerald-700 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}
      {fac.services && fac.services.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Services</p>
          <div className="flex flex-wrap gap-2">
            {fac.services.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-full">
                <BookOpen size={12} /> {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {fac.languages && fac.languages.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Khutbah Languages</p>
          <div className="flex flex-wrap gap-2">
            {fac.languages.map((l) => (
              <span key={l} className="flex items-center gap-1.5 text-sm font-medium bg-[#f2f3ff] text-[#4f5af5] px-3 py-1.5 rounded-full">
                <Globe size={12} /> {l}
              </span>
            ))}
          </div>
        </div>
      )}
      {amenityKeys.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Amenities</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {amenityKeys.map((key) => {
              const Icon = AMENITY_ICONS[key] ?? Wifi;
              return (
                <div key={key} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#003527]" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{AMENITY_LABELS[key]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdhanSection  — lists adhan audio files for this masjid
// ─────────────────────────────────────────────────────────────────────────────

function AdhanSection({ masjidId }: { masjidId: string }) {
  const { adhanFiles, isLoading, error } = useAdhanList({ masjidId, limit: 20 });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (file: AdhanFile) => {
    if (playingId === file.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(file.url);
    audioRef.current = audio;
    audio.play();
    setPlayingId(file.id);
    audio.onended = () => setPlayingId(null);
  };

  // Stop audio on unmount
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (isLoading) {
    return (
      <SectionCard title="Adhan Files">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </SectionCard>
    );
  }

  // Silently skip section on auth error or if no files
  if (error === "unauthenticated" || adhanFiles.length === 0) return null;

  if (error) {
    return (
      <SectionCard title="Adhan Files">
        <p className="text-sm text-red-400 py-4 text-center">{error}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Adhan Files">
      <div className="space-y-2">
        {adhanFiles.map((file) => {
          const isPlaying = playingId === file.id;
          return (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 border transition-all",
                isPlaying
                  ? "bg-[#003527] border-[#003527] text-white"
                  : "bg-slate-50 border-slate-100 hover:bg-emerald-50 hover:border-emerald-100"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                isPlaying ? "bg-white/20" : "bg-emerald-100"
              )}>
                <Music2 size={15} className={isPlaying ? "text-white" : "text-[#003527]"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  isPlaying ? "text-white" : "text-[#003527]"
                )}>
                  {file.name}
                </p>
                {file.updated_at && (
                  <p className={cn(
                    "text-[11px] mt-0.5",
                    isPlaying ? "text-emerald-200" : "text-slate-400"
                  )}>
                    Updated {new Date(file.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handlePlay(file)}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all",
                  isPlaying
                    ? "bg-white text-[#003527] hover:bg-emerald-50"
                    : "bg-[#003527] text-white hover:bg-emerald-800"
                )}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying
                  ? <Pause size={14} className="fill-current" />
                  : <Play size={14} className="fill-current ml-0.5" />
                }
              </button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GallerySection  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function GallerySection({ media }: { media: ReturnType<typeof useMasjidMedia> }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photos = media.gallery?.data ?? [];
  if (media.loading && photos.length === 0) {
    return (
      <SectionCard title="Gallery">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      </SectionCard>
    );
  }
  if (photos.length === 0) return null;
  return (
    <>
      <SectionCard title="Gallery">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <button key={photo.id} onClick={() => setLightbox(photo.photo_url)} className="aspect-square rounded-xl overflow-hidden group relative bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.photo_url} alt={photo.caption ?? `Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              {photo.caption && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </SectionCard>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}><X size={28} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Gallery" className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactCard  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ContactCard({ masjid }: { masjid: Mosque }) {
  const phone = masjid.phone_number
    ? `+${masjid.phone_number.country_code} ${masjid.phone_number.number}`
    : null;
  return (
    <SectionCard title="Get in Touch" className="h-fit">
      <div className="space-y-4">
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-3 text-slate-600 hover:text-[#003527] transition-colors group">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors"><Phone size={15} className="text-[#003527]" /></div>
            <span className="text-sm font-medium">{phone}</span>
          </a>
        )}
        {masjid.subDomain && (
          <a href={`https://${masjid.subDomain}.masjids.io`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-600 hover:text-[#003527] transition-colors group">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors"><Globe size={15} className="text-[#003527]" /></div>
            <span className="text-sm font-medium truncate">{masjid.subDomain}.masjids.io</span>
          </a>
        )}
        {masjid.address && (
          <div className="flex items-start gap-3 text-slate-600">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5"><MapPin size={15} className="text-[#003527]" /></div>
            <span className="text-sm font-medium leading-relaxed">{[masjid.address, masjid.city, masjid.countryCode].filter(Boolean).join(", ")}</span>
          </div>
        )}
      </div>
      {masjid.latitude && masjid.longitude && (
        <div className="mt-5 space-y-2">
          <MapEmbed lat={Number(masjid.latitude)} lng={Number(masjid.longitude)} name={masjid.name} />
          <a href={`https://www.google.com/maps?q=${masjid.latitude},${masjid.longitude}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-[#003527] hover:text-white hover:border-[#003527] transition-all">
            <MapPin size={13} /> Open in Google Maps
          </a>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsBar  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function StatsBar({ masjid, media, followerCount }: { masjid: Mosque; media: ReturnType<typeof useMasjidMedia>; followerCount: number | null }) {
  const capacity     = media.facility?.data?.capacity?.total;
  const langCount    = media.facility?.data?.languages?.length ?? 0;
  const serviceCount = media.facility?.data?.services?.length ?? 0;
  const stats = [
    { label: "Followers", value: followerCount !== null ? followerCount.toLocaleString() : "—", icon: Heart },
    { label: "Capacity",  value: capacity?.toLocaleString() ?? "—", icon: Users },
    { label: "Languages", value: langCount  > 0 ? `${langCount}`  : "—", icon: Globe },
    { label: "Services",  value: serviceCount > 0 ? `${serviceCount}` : "—", icon: Building2 },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0"><Icon size={17} className="text-[#003527]" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-lg font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page  (unchanged except imports / PrayerTimesSection)
// ─────────────────────────────────────────────────────────────────────────────

export default function PublicMasjidPage() {
  const { id } = useParams<{ id: string }>();
  const { getMasjid } = useMasjids();
  const media = useMasjidMedia();
  const [masjid, setMasjid]   = useState<Mosque | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Followers ─────────────────────────────────────────────────────────────
  const {
    followStatus,
    loading: followLoading,
    getFollowStatus,
    toggleFollow,
  } = useFollowers();

  const isFollowing = followStatus?.data?.following ?? false;
  const followerCount = followStatus?.data?.follower_count ?? null;

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    getMasjid(id)
      .then((m) => {
        setMasjid(m);
        media.getCoverPhoto(id);
        media.getGallery(id);
        media.getFacility(id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load masjid."))
      .finally(() => setLoading(false));
    // Fetch real follow status for this masjid
    getFollowStatus(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const coverUrl =
    media.coverPhoto?.data?.cover_photo_url ||
    (masjid as (Mosque & { imageUrl?: string }) | null)?.imageUrl ||
    PLACEHOLDER;

  if (loading) return <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[#003527]" /></div>;

  if (error || !masjid) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center gap-4 text-center px-6">
        <RefreshCw size={32} className="text-slate-300" />
        <h2 className="text-xl font-bold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>Could not load this masjid</h2>
        <p className="text-sm text-slate-400">{error ?? "Masjid not found."}</p>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-[#003527] underline underline-offset-2">Try again</button>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div className="bg-[#faf8ff] min-h-screen" style={{ fontFamily: "DM Sans, sans-serif" }}>

        {/* HERO */}
        <section className="relative w-full h-[460px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt={masjid.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,30,20,0.88) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 max-w-[1400px] mx-auto px-8 pb-10">
            <div className="flex flex-col gap-2 text-white">
        
              <h1 className="text-4xl md:text-[52px] font-extrabold leading-tight text-white tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{masjid.name}</h1>
              <p className="text-lg text-white/75 flex items-center gap-1.5"><MapPin size={15} />{[masjid.city, masjid.countryCode].filter(Boolean).join(", ") || masjid.location}</p>
                <div className="flex gap-3 mt-3 flex-wrap">
                <button
                  onClick={() => toggleFollow(id)}
                  disabled={followLoading}
                  className={cn(
                    "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
                    followLoading ? "opacity-60 cursor-not-allowed" : "",
                    isFollowing
                      ? "bg-red-500 text-white"
                      : "bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20"
                  )}
                >
                  {followLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Heart size={14} className={isFollowing ? "fill-white" : ""} />
                  }
                  {isFollowing ? "Following" : "Follow"}
                  {followerCount !== null && (
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      isFollowing ? "bg-red-400/40" : "bg-white/15"
                    )}>
                      {followerCount.toLocaleString()}
                    </span>
                  )}
                </button>
                <button onClick={() => navigator.share?.({ title: masjid.name, url: window.location.href })} className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20 transition-all">
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SUB-NAV — sticky, offset below the global site navbar so the two
            bars stack instead of overlapping each other when scrolled. */}
        <nav
          className="sticky z-40 border-b"
          style={{
            top: GLOBAL_NAVBAR_HEIGHT_PX,
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: "rgba(0,53,39,0.09)",
            boxShadow: "0 2px 14px rgba(0,53,39,0.06)",
          }}
        >
          <div className="max-w-[1400px] mx-auto px-8 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <span className="font-extrabold text-[#003527] text-[15px] mr-4 py-4 pr-5 border-r border-slate-200 shrink-0 whitespace-nowrap" style={{ fontFamily: "Manrope, sans-serif" }}>
              {masjid.name.split(" ").slice(0, 2).join(" ")}
            </span>
            {NAV_ITEMS.map((item) =>
              item.isDonate ? (
                <a key={item.href} href={`/public-masjids/${id}/${item.href}`} className="ml-auto flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl my-2 shrink-0 whitespace-nowrap transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}>
                  {item.label}
                </a>
              ) : (
                <a key={item.href} href={`/public-masjids/${id}/${item.href}`} className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13.5px] font-medium my-1.5 whitespace-nowrap shrink-0 transition-all", item.href === "overview" ? "bg-[#003527] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-[#003527]")}>
                  {item.label}
                </a>
              )
            )}
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-10">
          <StatsBar masjid={masjid} media={media} followerCount={followerCount} />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-8">
              <PrayerTimesSection masjid={masjid} />
              <AdhanSection masjidId={id} />
              <FacilitySection media={media} />
              <GallerySection media={media} />
            </div>
            <div className="space-y-6">
              <ContactCard masjid={masjid} />
              {masjid.prayer_times_configuration && (
                <SectionCard title="Prayer Method" className="h-fit">
                  <div className="space-y-3 text-sm">
                    {[
                      ["Method",        masjid.prayer_times_configuration.method],
                      ["Asr",           masjid.prayer_times_configuration.asr_method],
                      ["Fajr Angle",    `${masjid.prayer_times_configuration.fajr_angle}°`],
                      ["Isha Angle",    `${masjid.prayer_times_configuration.isha_angle}°`],
                      ["High Latitude", masjid.prayer_times_configuration.high_latitude_rule?.replace(/_/g, " ").toLowerCase()],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                        <span className="text-slate-400 font-medium">{label}</span>
                        <span className="text-[#003527] font-semibold text-right capitalize">{val}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
              <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-md" style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}>
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 -mr-8 -mt-8 rounded-full blur-2xl" />
                <h3 className="text-lg font-bold mb-2 relative z-10" style={{ fontFamily: "Manrope, sans-serif" }}>Be Part of the Community</h3>
                <p className="text-white/65 text-sm mb-5 leading-relaxed relative z-10">Join our volunteer network and help serve the Ummah.</p>
                <button className="w-full py-2.5 bg-white text-[#003527] font-bold text-sm rounded-xl hover:bg-emerald-50 transition-colors relative z-10 flex items-center justify-center gap-1.5">
                  Apply Now <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-[#003527] text-white px-8 py-12 mt-8">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-5">
            <div>
              <span className="text-xl font-extrabold tracking-tight block" style={{ fontFamily: "Manrope, sans-serif" }}>masjids.io</span>
              <p className="text-emerald-200/50 text-sm mt-0.5">© 2024 masjids.io. The Sacred Sanctuary.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {["About Us", "Privacy Policy", "Terms of Service", "Contact"].map((l) => (
                <a key={l} href="#" className="text-sm text-emerald-200/50 hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}