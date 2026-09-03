"use client";

/* ─────────────────────────────────────────────────────────────
   components/masjid/RegisterMasjidModal.tsx

   Dual-mode modal — register a new masjid OR edit an existing one.

   Register mode  (default):
     - Empty form, POST via createMasjid()
     - Header: "Register New Masjid"
     - Success: "Masjid Registered!"

   Edit mode  (pass initialData + masjidId + updateMasjid):
     - Form pre-filled from initialData, PATCH via updateMasjid()
     - Header: "Edit Masjid"
     - Success: "Changes Saved!"
     - subDomain field is read-only (can't rename a live subdomain)

   FIX: `version` is now carried from initialData → payload so the
   API's optimistic-concurrency check passes on PATCH.

   Steps:
     1. Basic Info   — name, subDomain, location (lat/lng) + OSM map pin
     2. Address      — address_line_1/2, city, postal_code, country_code
     3. Contact      — phone country_code + number
     4. Prayer Times — method, fajr_angle, isha_angle, asr_method,
                       high_latitude_rule, adjustments
     5. Review       — read-only summary before submit
   ───────────────────────────────────────────────────────────── */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type CreateMasjidPayload, type UpdateMasjidPayload } from "@/hooks/useMasjids";
import {
  X,
  Building2,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Globe,
  Check,
  Navigation,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mosque } from "@/types/masjid";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RegisterPayload {
  name: string;
  location: string;
  subDomain: string;
  latitude: number | string;
  longitude: number | string;
  // FIX: version must be sent on PATCH for the API's optimistic-concurrency check
  version?: number;
  address: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    postal_code: string;
    country_code: string;
  };
  phone_number: {
    country_code: string;
    number: string;
  };
  prayer_times_configuration: {
    name: string;
    method: string;
    fajr_angle: number;
    isha_angle: number;
    isha_interval: number;
    asr_method: string;
    high_latitude_rule: string;
    adjustments: {
      fajr: number;
      dhuhr: number;
      asr: number;
      maghrib: number;
      isha: number;
    };
  };
}

const PRAYER_METHODS = [
  { value: "MUSLIM_WORLD_LEAGUE",      label: "Muslim World League" },
  { value: "EGYPTIAN",                 label: "Egyptian General Authority" },
  { value: "KARACHI",                  label: "University of Islamic Sciences, Karachi" },
  { value: "UMM_AL_QURA",             label: "Umm Al-Qura, Makkah" },
  { value: "DUBAI",                    label: "Dubai" },
  { value: "MOONSIGHTING_COMMITTEE",   label: "Moonsighting Committee" },
  { value: "NORTH_AMERICA",            label: "Islamic Society of North America" },
  { value: "KUWAIT",                   label: "Kuwait" },
  { value: "QATAR",                    label: "Qatar" },
  { value: "SINGAPORE",                label: "Majlis Ugama Islam Singapura" },
  { value: "TEHRAN",                   label: "Institute of Geophysics, Tehran" },
  { value: "TURKEY",                   label: "Diyanet İşleri Başkanlığı, Turkey" },
];

const ASR_METHODS = [
  { value: "SHAFI_HANBALI_MALIKI", label: "Standard (Shafi'i, Maliki, Hanbali)" },
  { value: "HANAFI",               label: "Hanafi" },
];

const HIGH_LATITUDE_RULES = [
  { value: "MIDDLE_OF_THE_NIGHT",  label: "Middle of the Night" },
  { value: "SEVENTH_OF_THE_NIGHT", label: "Seventh of the Night" },
  { value: "TWILIGHT_ANGLE",       label: "Twilight Angle" },
];

const COUNTRY_CODES = [
  { code: "US", name: "United States",  phone: "1"   },
  { code: "GB", name: "United Kingdom", phone: "44"  },
  { code: "CA", name: "Canada",         phone: "1"   },
  { code: "AU", name: "Australia",      phone: "61"  },
  { code: "ID", name: "Indonesia",      phone: "62"  },
  { code: "MY", name: "Malaysia",       phone: "60"  },
  { code: "SG", name: "Singapore",      phone: "65"  },
  { code: "SA", name: "Saudi Arabia",   phone: "966" },
  { code: "AE", name: "UAE",            phone: "971" },
  { code: "PK", name: "Pakistan",       phone: "92"  },
  { code: "BD", name: "Bangladesh",     phone: "880" },
  { code: "IN", name: "India",          phone: "91"  },
  { code: "EG", name: "Egypt",          phone: "20"  },
  { code: "TR", name: "Turkey",         phone: "90"  },
  { code: "NG", name: "Nigeria",        phone: "234" },
];

const STEPS = [
  { id: 1, label: "Basic Info", icon: Building2 },
  { id: 2, label: "Address", icon: MapPin },
  { id: 3, label: "Contact", icon: Phone },
  { id: 4, label: "Prayer Times", icon: Clock },
  { id: 5, label: "Review", icon: CheckCircle2 },
];

const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.006;

function defaultPayload(): RegisterPayload {
  return {
    name: "",
    location: "",
    subDomain: "",
    latitude: "",
    longitude: "",
    // version is undefined for new masjids (POST doesn't need it)
    address: {
      address_line_1: "",
      address_line_2: "",
      city: "",
      postal_code: "",
      country_code: "US",
    },
    phone_number: { country_code: "1", number: "" },
    prayer_times_configuration: {
      name: "Default",
      method: "NORTH_AMERICA",
      fajr_angle: 15,
      isha_angle: 15,
      isha_interval: 0,
      asr_method: "SHAFI_HANBALI_MALIKI",
      high_latitude_rule: "MIDDLE_OF_THE_NIGHT",
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
  };
}

/** Map a Mosque object (from useMasjids / the list) into the modal's local payload shape */
function masjidToPayload(m: Mosque): RegisterPayload {
  const addr = m.address_structured;
  const ptc  = m.prayer_times_configuration;
  return {
    name:      m.name ?? "",
    location:  m.location ?? "",
    subDomain: m.subDomain ?? "",
    latitude:  m.latitude ?? "",
    longitude: m.longitude ?? "",
    // FIX: carry version so the PATCH body includes it for optimistic-concurrency
    version:   m.version,
    address: {
      address_line_1: addr?.address_line_1 ?? "",
      address_line_2: addr?.address_line_2 ?? "",
      city:           addr?.city           ?? "",
      postal_code:    addr?.postal_code    ?? "",
      country_code:   addr?.country_code   ?? "US",
    },
    phone_number: {
      country_code: m.phone_number?.country_code ?? "1",
      number:       m.phone_number?.number       ?? "",
    },
    prayer_times_configuration: {
      name:               ptc?.name               ?? "Default",
      method:             ptc?.method             ?? "NORTH_AMERICA",
      fajr_angle:         ptc?.fajr_angle         ?? 15,
      isha_angle:         ptc?.isha_angle          ?? 15,
      isha_interval:      ptc?.isha_interval       ?? 0,
      asr_method:         ptc?.asr_method          ?? "SHAFI_HANBALI_MALIKI",
      high_latitude_rule: ptc?.high_latitude_rule  ?? "MIDDLE_OF_THE_NIGHT",
      adjustments: {
        fajr:    ptc?.adjustments?.fajr    ?? 0,
        dhuhr:   ptc?.adjustments?.dhuhr   ?? 0,
        asr:     ptc?.adjustments?.asr     ?? 0,
        maghrib: ptc?.adjustments?.maghrib ?? 0,
        isha:    ptc?.adjustments?.isha    ?? 0,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Map Picker (Leaflet, lazy-loaded for SSR safety)
// ─────────────────────────────────────────────────────────────

interface MapPickerProps {
  lat: number | string;
  lng: number | string;
  onPick: (lat: number, lng: number) => void;
}

function MapPicker({ lat, lng, onPick }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(false);

  const initLat = lat !== "" ? Number(lat) : DEFAULT_LAT;
  const initLng = lng !== "" ? Number(lng) : DEFAULT_LNG;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          center: [initLat, initLng],
          zoom: 13,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const greenIcon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:38px;position:relative;">
            <svg viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 9.6 14 24 14 24S28 23.6 28 14C28 6.268 21.732 0 14 0z" fill="#003527"/>
              <circle cx="14" cy="14" r="6" fill="white"/>
            </svg>
          </div>`,
          iconSize: [28, 38],
          iconAnchor: [14, 38],
          popupAnchor: [0, -38],
        });

        const marker = L.marker([initLat, initLng], {
          icon: greenIcon,
          draggable: true,
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPick(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
        });

        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          onPick(Math.round(e.latlng.lat * 1e6) / 1e6, Math.round(e.latlng.lng * 1e6) / 1e6);
        });

        mapRef.current = map;
        markerRef.current = marker;
      } catch {
        if (!cancelled) setMapError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!markerRef.current || lat === "" || lng === "") return;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!isNaN(numLat) && !isNaN(numLng)) {
      markerRef.current.setLatLng([numLat, numLng]);
      mapRef.current?.panTo([numLat, numLng]);
    }
  }, [lat, lng]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const roundLat = Math.round(latitude * 1e6) / 1e6;
        const roundLng = Math.round(longitude * 1e6) / 1e6;
        onPick(roundLat, roundLng);
        markerRef.current?.setLatLng([roundLat, roundLng]);
        mapRef.current?.setView([roundLat, roundLng], 15);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  if (mapError) {
    return (
      <div className="h-48 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-xs text-slate-400">
        Map unavailable — enter coordinates manually above.
      </div>
    );
  }

  return (
    <div className="relative">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={containerRef}
        className="h-56 rounded-xl overflow-hidden border border-[#eaedff]"
        style={{ zIndex: 0 }}
      />
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={locating}
        className="absolute bottom-3 right-3 z-[400] inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#eaedff] text-[#003527] text-[11px] font-bold rounded-lg shadow-sm hover:bg-[#f2f3ff] transition-colors disabled:opacity-60"
      >
        {locating ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
        {locating ? "Locating…" : "Use my location"}
      </button>
      <p className="text-[10px] text-slate-400 mt-1.5">
        Click on the map or drag the pin to set coordinates.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared field primitives
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[#131b2e]">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-slate-400">{hint}</p>}
      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle size={9} /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (error?: string) =>
  cn(
    "w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#131b2e] bg-[#f2f3ff] placeholder:text-slate-400 transition-all",
    "focus:outline-none focus:ring-2 focus:bg-white",
    error
      ? "border-red-300 focus:ring-red-200"
      : "border-transparent focus:ring-[#064e3b]/20 focus:border-[#064e3b]/30"
  );

const selectCls = cn(
  "w-full px-3.5 py-2.5 rounded-xl border border-transparent text-sm text-[#131b2e] bg-[#f2f3ff]",
  "focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:bg-white transition-all appearance-none"
);

function NumberAdjust({
  label,
  value,
  onChange,
  min = -60,
  max = 60,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-7 w-7 rounded-lg bg-[#eaedff] text-[#003527] font-extrabold text-sm hover:bg-[#d5d9ff] transition-colors"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-extrabold text-[#131b2e]">
          {value > 0 ? `+${value}` : value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-7 w-7 rounded-lg bg-[#eaedff] text-[#003527] font-extrabold text-sm hover:bg-[#d5d9ff] transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step Panels
// ─────────────────────────────────────────────────────────────

type Errors = Record<string, string>;

function Step1({
  data,
  errors,
  onChange,
  isEditMode,
}: {
  data: RegisterPayload;
  errors: Errors;
  onChange: (patch: Partial<RegisterPayload>) => void;
  isEditMode: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field label="Masjid Name" required error={errors.name}>
        <input
          className={inputCls(errors.name)}
          placeholder="e.g. Masjid Al-Noor"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>

      <Field
        label="Subdomain"
        required={!isEditMode}
        error={errors.subDomain}
        hint={isEditMode ? "Subdomain cannot be changed after registration." : "Will become: yourname.masjids.io"}
      >
        {isEditMode ? (
          /* Read-only in edit mode — subdomain changes break live URLs */
          <div className="flex items-center gap-0 opacity-60 cursor-not-allowed">
            <input
              className={cn(inputCls(), "rounded-r-none bg-[#eaedff]")}
              value={data.subDomain}
              readOnly
              tabIndex={-1}
            />
            <span className="px-3 py-2.5 bg-[#d5d9ff] text-xs font-semibold text-slate-500 rounded-r-xl border-l border-[#c8ccee] whitespace-nowrap">
              .masjids.io
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-0">
            <input
              className={cn(inputCls(errors.subDomain), "rounded-r-none")}
              placeholder="al-noor"
              value={data.subDomain}
              onChange={(e) =>
                onChange({
                  subDomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })
              }
            />
            <span className="px-3 py-2.5 bg-[#eaedff] text-xs font-semibold text-slate-500 rounded-r-xl border-l border-[#d5d9ff] whitespace-nowrap">
              .masjids.io
            </span>
          </div>
        )}
      </Field>

      <Field
        label="Location (human readable)"
        required
        error={errors.location}
        hint="City and region shown on listings, e.g. Brooklyn, New York"
      >
        <input
          className={inputCls(errors.location)}
          placeholder="Brooklyn, New York"
          value={data.location}
          onChange={(e) => onChange({ location: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" required error={errors.latitude}>
          <input
            type="number"
            step="any"
            className={inputCls(errors.latitude)}
            placeholder="40.712800"
            value={data.latitude}
            onChange={(e) => onChange({ latitude: e.target.value })}
          />
        </Field>
        <Field label="Longitude" required error={errors.longitude}>
          <input
            type="number"
            step="any"
            className={inputCls(errors.longitude)}
            placeholder="-74.006000"
            value={data.longitude}
            onChange={(e) => onChange({ longitude: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Pin Location on Map">
        <MapPicker
          lat={data.latitude}
          lng={data.longitude}
          onPick={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        />
      </Field>
    </div>
  );
}

function Step2({
  data,
  errors,
  onChange,
}: {
  data: RegisterPayload;
  errors: Errors;
  onChange: (patch: Partial<RegisterPayload["address"]>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Address Line 1" required error={errors.address_line_1}>
        <input
          className={inputCls(errors.address_line_1)}
          placeholder="123 Main Street"
          value={data.address.address_line_1}
          onChange={(e) => onChange({ address_line_1: e.target.value })}
        />
      </Field>

      <Field label="Address Line 2">
        <input
          className={inputCls()}
          placeholder="Suite 4B (optional)"
          value={data.address.address_line_2}
          onChange={(e) => onChange({ address_line_2: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City" required error={errors.city}>
          <input
            className={inputCls(errors.city)}
            placeholder="New York"
            value={data.address.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </Field>
        <Field label="ZIP Code" required error={errors.postal_code}>
          <input
            className={inputCls(errors.postal_code)}
            placeholder="10001"
            value={data.address.postal_code}
            onChange={(e) => onChange({ postal_code: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Country" required error={errors.country_code}>
        <div className="relative">
          <select
            className={selectCls}
            value={data.address.country_code}
            onChange={(e) => onChange({ country_code: e.target.value })}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <Globe size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </Field>
    </div>
  );
}

function Step3({
  data,
  errors,
  onChange,
}: {
  data: RegisterPayload;
  errors: Errors;
  onChange: (patch: Partial<RegisterPayload["phone_number"]>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Enter a contact number for this masjid. This will be visible on the public listing.
      </p>

      <Field label="Country Dial Code" required>
        <div className="relative">
          <select
            className={selectCls}
            value={data.phone_number.country_code}
            onChange={(e) => onChange({ country_code: e.target.value })}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.phone}>
                {c.name} (+{c.phone})
              </option>
            ))}
          </select>
          <Phone size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="Phone Number" required error={errors.phone_number}>
        <div className="flex items-center gap-0">
          <span className="px-3 py-2.5 bg-[#eaedff] text-xs font-semibold text-[#003527] rounded-l-xl border-r border-[#d5d9ff] whitespace-nowrap">
            +{data.phone_number.country_code}
          </span>
          <input
            type="tel"
            className={cn(inputCls(errors.phone_number), "rounded-l-none")}
            placeholder="2125550100"
            value={data.phone_number.number}
            onChange={(e) => onChange({ number: e.target.value.replace(/\D/g, "") })}
          />
        </div>
      </Field>
    </div>
  );
}

function Step4({
  data,
  onChange,
}: {
  data: RegisterPayload;
  onChange: (patch: Partial<RegisterPayload["prayer_times_configuration"]>) => void;
}) {
  const ptc = data.prayer_times_configuration;

  return (
    <div className="space-y-5">
      <Field label="Calculation Method" required>
        <div className="relative">
          <select
            className={selectCls}
            value={ptc.method}
            onChange={(e) => onChange({ method: e.target.value })}
          >
            {PRAYER_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Clock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fajr Angle (°)" hint="Degrees below horizon">
          <input
            type="number"
            className={inputCls()}
            value={ptc.fajr_angle}
            onChange={(e) => onChange({ fajr_angle: parseFloat(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Isha Angle (°)" hint="Degrees below horizon">
          <input
            type="number"
            className={inputCls()}
            value={ptc.isha_angle}
            onChange={(e) => onChange({ isha_angle: parseFloat(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <Field label="Asr Method">
        <div className="flex gap-2">
          {ASR_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ asr_method: m.value })}
              className={cn(
                "flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all",
                ptc.asr_method === m.value
                  ? "bg-[#003527] border-[#003527] text-white"
                  : "bg-[#f2f3ff] border-transparent text-slate-500 hover:border-[#eaedff]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="High Latitude Rule">
        <div className="relative">
          <select
            className={selectCls}
            value={ptc.high_latitude_rule}
            onChange={(e) => onChange({ high_latitude_rule: e.target.value })}
          >
            {HIGH_LATITUDE_RULES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div>
        <p className="text-xs font-bold text-[#131b2e] mb-3">
          Prayer Time Adjustments (minutes)
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 justify-between">
          {(["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((p) => (
            <NumberAdjust
              key={p}
              label={p}
              value={ptc.adjustments[p]}
              onChange={(v) =>
                onChange({ adjustments: { ...ptc.adjustments, [p]: v } })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[#f2f3ff] last:border-0 gap-4">
      <span className="text-xs text-slate-400 font-medium shrink-0 w-32">{label}</span>
      <span className="text-xs font-semibold text-[#131b2e] text-right">{value}</span>
    </div>
  );
}

function Step5({ data, isEditMode }: { data: RegisterPayload; isEditMode: boolean }) {
  const ptc = data.prayer_times_configuration;
  const adj = ptc.adjustments;
  const adjStr =
    Object.entries(adj)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}m`)
      .join(", ") || "None";

  return (
    <div className="space-y-4">
      <div className="bg-[#f2f3ff] rounded-xl px-4 py-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">Basic Info</p>
        <ReviewRow label="Name" value={data.name} />
        <ReviewRow label="Subdomain" value={`${data.subDomain}.masjids.io`} />
        <ReviewRow label="Location" value={data.location} />
        <ReviewRow label="Coordinates" value={`${data.latitude}, ${data.longitude}`} />
      </div>

      <div className="bg-[#f2f3ff] rounded-xl px-4 py-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">Address</p>
        <ReviewRow
          label="Street"
          value={[data.address.address_line_1, data.address.address_line_2]
            .filter(Boolean)
            .join(", ")}
        />
        <ReviewRow label="City / ZIP" value={`${data.address.city}, ${data.address.postal_code}`} />
        <ReviewRow label="Country" value={data.address.country_code} />
      </div>

      <div className="bg-[#f2f3ff] rounded-xl px-4 py-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">Prayer Times</p>
        <ReviewRow
          label="Method"
          value={PRAYER_METHODS.find((m) => m.value === ptc.method)?.label ?? ptc.method}
        />
        <ReviewRow label="Fajr / Isha angles" value={`${ptc.fajr_angle}° / ${ptc.isha_angle}°`} />
        <ReviewRow label="Asr method" value={ptc.asr_method} />
        <ReviewRow label="Adjustments" value={adjStr} />
      </div>

      <div className="flex items-start gap-2.5 bg-[#b0f0d6]/30 text-[#003527] rounded-xl px-4 py-3 text-xs font-medium">
        <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
        {isEditMode
          ? "Ready to save. Your changes will be applied immediately."
          : "Ready to register. You can edit all settings after creation."}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────────────────────

interface BaseProps {
  onClose: () => void;
  onSuccess?: (masjidId: string) => void;
}

interface RegisterProps extends BaseProps {
  /** Register mode — provide createMasjid, leave masjidId + initialData + updateMasjid undefined */
  createMasjid: (payload: CreateMasjidPayload) => Promise<string>;
  isCreating?: boolean;
  masjidId?: never;
  initialData?: never;
  updateMasjid?: never;
  isUpdating?: never;
}

interface EditProps extends BaseProps {
  /** Edit mode — provide masjidId + initialData + updateMasjid, leave createMasjid undefined */
  masjidId: string;
  initialData: Mosque;
  updateMasjid: (masjidId: string, payload: UpdateMasjidPayload) => Promise<Mosque>;
  isUpdating?: boolean;
  createMasjid?: never;
  isCreating?: never;
}

type Props = RegisterProps | EditProps;

export function RegisterMasjidModal(props: Props) {
  const { onClose, onSuccess } = props;

  const isEditMode = "masjidId" in props && !!props.masjidId;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegisterPayload>(() =>
    isEditMode && props.initialData
      ? masjidToPayload(props.initialData)
      : defaultPayload()
  );
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // ✅ FIX: clear only the error(s) for the field(s) actually being edited,
  // instead of wiping all errors on every keystroke anywhere in the form —
  // aligned with the same pattern used on the standalone Register
  // Community page. touchedKeys map 1:1 to error keys for top-level fields.
  const patchData = useCallback((patch: Partial<RegisterPayload>) => {
    setData((d) => ({ ...d, ...patch }));
    const touchedKeys = Object.keys(patch);
    setErrors((prev) => {
      const next = { ...prev };
      touchedKeys.forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  // ✅ FIX: address sub-field patch keys (address_line_1, city,
  // postal_code, country_code) map 1:1 to their error keys, so clearing is
  // direct — same reasoning as patchData above.
  const patchAddress = useCallback((patch: Partial<RegisterPayload["address"]>) => {
    setData((d) => ({ ...d, address: { ...d.address, ...patch } }));
    const touchedKeys = Object.keys(patch);
    setErrors((prev) => {
      const next = { ...prev };
      touchedKeys.forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  // ✅ FIX: the phone sub-field is named "number" in the payload, but its
  // error key is "phone_number" (see validate() below) — map that instead
  // of assuming a 1:1 key match like the two patchers above.
  const patchPhone = useCallback((patch: Partial<RegisterPayload["phone_number"]>) => {
    setData((d) => ({ ...d, phone_number: { ...d.phone_number, ...patch } }));
    if ("number" in patch) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone_number;
        return next;
      });
    }
  }, []);

  const patchPtc = useCallback(
    (patch: Partial<RegisterPayload["prayer_times_configuration"]>) => {
      setData((d) => ({
        ...d,
        prayer_times_configuration: { ...d.prayer_times_configuration, ...patch },
      }));
    },
    []
  );

  const validate = useCallback((): boolean => {
    const e: Errors = {};
    if (step === 1) {
      if (!data.name.trim()) e.name = "Required";
      if (!isEditMode) {
        if (!data.subDomain.trim()) e.subDomain = "Required";
        else if (!/^[a-z0-9-]+$/.test(data.subDomain))
          e.subDomain = "Only lowercase letters, numbers and hyphens";
      }
      if (!data.location.trim()) e.location = "Required";
      if (!data.latitude) e.latitude = "Required";
      if (!data.longitude) e.longitude = "Required";
    }
    if (step === 2) {
      if (!data.address.address_line_1.trim()) e.address_line_1 = "Required";
      if (!data.address.city.trim()) e.city = "Required";
      if (!data.address.postal_code.trim()) e.postal_code = "Required";
    }
    if (step === 3) {
      if (!data.phone_number.number.trim()) e.phone_number = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [step, data, isEditMode]);

  const next = useCallback(() => {
    if (!validate()) return;
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setStep((s) => Math.min(s + 1, 5));
  }, [validate]);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEditMode) {
        // ── Edit / PATCH ──────────────────────────────────────
        // FIX: spread data first (which now includes `version` from masjidToPayload),
        // then override lat/lng as strings. The `version` field travels through
        // automatically and satisfies the API's optimistic-concurrency check.
        const payload: UpdateMasjidPayload = {
          ...data,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
        };
        const updated = await (props as EditProps).updateMasjid(
          (props as EditProps).masjidId,
          payload
        );
        setDone(true);
        setTimeout(() => {
          onSuccess?.(updated.id ?? (props as EditProps).masjidId);
          onClose();
        }, 1500);
      } else {
        // ── Register / POST ───────────────────────────────────
        const payload: CreateMasjidPayload = {
          ...data,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
        };
        const newId = await (props as RegisterProps).createMasjid(payload);
        setDone(true);
        setTimeout(() => {
          onSuccess?.(newId);
          onClose();
        }, 1800);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : isEditMode ? "Update failed" : "Registration failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isEditMode, props, onSuccess, onClose]);

  const isBusy =
    isSubmitting ||
    (isEditMode ? (props as EditProps).isUpdating : (props as RegisterProps).isCreating) ||
    false;

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#131b2e]/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full sm:max-w-lg bg-white sm:rounded-2xl overflow-hidden shadow-2xl max-h-[96dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-[#eaedff] shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                {isEditMode && (
                  <div className="h-6 w-6 rounded-lg bg-[#b0f0d6]/50 flex items-center justify-center">
                    <Pencil size={11} className="text-[#003527]" />
                  </div>
                )}
                <h2
                  className="text-lg font-extrabold text-[#003527]"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {isEditMode ? "Edit Masjid" : "Register New Masjid"}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Step {step} of {STEPS.length} — {STEPS[step - 1].label}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              data-testid="modal-close-btn"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = s.id === step;
              const done_ = s.id < step;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                    active
                      ? "bg-[#003527] text-white"
                      : done_
                      ? "bg-[#b0f0d6]/60 text-[#003527]"
                      : "bg-[#f2f3ff] text-slate-300"
                  )}
                  title={s.label}
                >
                  {done_ ? <Check size={12} /> : <Icon size={12} />}
                </div>
              );
            })}
            <div className="flex-1 h-1.5 bg-[#f2f3ff] rounded-full ml-1 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#003527] to-[#064e3b] rounded-full"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center gap-4"
              >
                <div className="h-16 w-16 rounded-2xl bg-[#b0f0d6]/40 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-[#003527]" />
                </div>
                <p
                  className="text-lg font-extrabold text-[#003527]"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {isEditMode ? "Changes Saved!" : "Masjid Registered!"}
                </p>
                <p className="text-sm text-slate-400 text-center">
                  {isEditMode
                    ? `${data.name} has been updated successfully.`
                    : `${data.name} has been successfully registered. Redirecting…`}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 && (
                  <Step1
                    data={data}
                    errors={errors}
                    onChange={patchData}
                    isEditMode={isEditMode}
                  />
                )}
                {step === 2 && <Step2 data={data} errors={errors} onChange={patchAddress} />}
                {step === 3 && <Step3 data={data} errors={errors} onChange={patchPhone} />}
                {step === 4 && <Step4 data={data} onChange={patchPtc} />}
                {step === 5 && <Step5 data={data} isEditMode={isEditMode} />}
              </motion.div>
            )}
          </AnimatePresence>

          {submitError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 text-xs font-medium px-4 py-3 rounded-xl"
            >
              <AlertCircle size={13} />
              {submitError}
            </motion.div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        {!done && (
          <div className="px-6 py-4 border-t border-[#eaedff] bg-[#f2f3ff]/40 flex items-center gap-3 shrink-0">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[#eaedff] text-[#131b2e] text-sm font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            <div className="flex-1" />

            {step < 5 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={next}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white text-sm font-bold rounded-xl"
                style={{ boxShadow: "0 4px 16px -4px rgba(0,53,39,0.35)" }}
              >
                Next
                <ChevronRight size={14} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={submit}
                disabled={isBusy}
                data-testid="modal-submit-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white text-sm font-bold rounded-xl disabled:opacity-60"
                style={{ boxShadow: "0 4px 16px -4px rgba(0,53,39,0.35)" }}
              >
                {isBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {isEditMode ? "Saving…" : "Registering…"}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    {isEditMode ? "Save Changes" : "Register Masjid"}
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}