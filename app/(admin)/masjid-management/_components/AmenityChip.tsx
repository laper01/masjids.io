import { Car, Accessibility, Users, Wifi, BookOpen, School, HeartPulse } from "lucide-react";

const AMENITY_META: Record<string, { icon: React.ReactNode; label: string }> = {
  parking: { icon: <Car size={12} />, label: "Parking" },
  wheelchair_accessible: { icon: <Accessibility size={12} />, label: "Accessible" },
  womens_section: { icon: <Users size={12} />, label: "Women's Section" },
  ablution_facilities: { icon: <Wifi size={12} />, label: "Wudu Facilities" },
  library: { icon: <BookOpen size={12} />, label: "Library" },
  classroom: { icon: <School size={12} />, label: "Classroom" },
  funeral_services: { icon: <HeartPulse size={12} />, label: "Funeral Services" },
};

export function AmenityChip({ amenityKey }: { amenityKey: string }) {
  const meta = AMENITY_META[amenityKey];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f2f3ff] text-[#131b2e] text-xs font-medium rounded-lg">
      <span className="text-[#003527]">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
