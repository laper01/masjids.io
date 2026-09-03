import { cn } from "@/lib/utils";
import type { Mosque } from "@/types/masjid";

export function StatsBar({
  mosques,
  totalCapacity,
  countryCount,
}: {
  mosques: Mosque[];
  totalCapacity: number;
  countryCount: number;
}) {
  const verified = mosques.filter((m) => m.is_verified).length;
  const pending = mosques.length - verified;

  const stats = [
    { label: "Total Masjids", value: mosques.length },
    ...(totalCapacity > 0
      ? [
          {
            label: "Total Capacity",
            value: totalCapacity.toLocaleString(),
            color: "text-[#003527]",
            bg: "bg-[#eaedff]",
          },
        ]
      : []),
    ...(countryCount > 1
      ? [
          {
            label: "Countries",
            value: countryCount,
            bg: "bg-[#f2f3ff]",
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl",
            s.bg ?? "bg-white border border-[#eaedff]"
          )}
          style={!s.bg ? { boxShadow: "0 1px 4px rgba(15,23,42,0.06)" } : {}}
        >
          <span
            className={cn("text-xl font-extrabold", s.color ?? "text-[#131b2e]")}
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {s.value}
          </span>
          <span className="text-xs text-slate-400 font-medium">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
