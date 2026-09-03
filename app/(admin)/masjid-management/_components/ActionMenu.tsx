import { useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Building2,
  Settings2,
  ExternalLink,
  Globe,
  Camera,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mosque } from "@/types/masjid";

// FIX (round 1): this used to be `absolute right-0 top-10 ...`, positioned
// relative to the row's action button inside a table wrapped in
// `overflow-x-auto`. Setting overflow-x forces overflow-y to compute to
// `auto` too (CSS spec behavior), so the wrapper clipped this menu whenever
// it would render past the wrapper's bottom edge. Rendering through a
// portal into document.body with `position: fixed` sidesteps that.
//
// FIX (round 2): portaling to document.body isn't enough on its own — if
// the trigger button sits near the bottom of the browser viewport (e.g. the
// last table row), `rect.bottom + 4` can still push the menu past the
// bottom of the *screen* itself. We now measure the menu's actual rendered
// height after mount and flip it to open upward (anchored above the
// button) whenever it would overflow the viewport's bottom edge.

export function ActionMenu({
  masjid,
  anchorRef,
  onClose,
  onOpenDetail,
  onUploadCover,
  onEditFacility,
  onDelete,
}: {
  masjid: Mosque;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onOpenDetail: () => void;
  onUploadCover: (m: Mosque) => void;
  onEditFacility: (m: Mosque) => void;
  onDelete: (m: Mosque) => void;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const MENU_WIDTH = 208; // w-52
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
      setCoords({ top: rect.bottom + 4, left });
      setVisible(false);
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!coords || visible) return;
    const menuEl = menuRef.current;
    const anchorRect = anchorRef.current?.getBoundingClientRect();
    if (!menuEl || !anchorRect) return;

    const menuRect = menuEl.getBoundingClientRect();
    const overflowsBottom = menuRect.bottom > window.innerHeight - 8;

    if (overflowsBottom) {
      const flippedTop = Math.max(8, anchorRect.top - menuRect.height - 4);
      setCoords((prev) => (prev ? { ...prev, top: flippedTop } : prev));
    }
    setVisible(true);
  }, [coords, visible, anchorRef]);

  const groups = [
    {
      items: [
        { icon: <Building2 size={14} />, label: "Quick View", onClick: onOpenDetail, danger: false },
        { icon: <Settings2 size={14} />, label: "Manage Settings", onClick: () => router.push(`/dashboard/masjids/${masjid.id}/settings`), danger: false },
        { icon: <ExternalLink size={14} />, label: "View Public Page", onClick: () => window.open(`https://${masjid.subDomain}.masjids.io`, "_blank"), danger: false },
        { icon: <Globe size={14} />, label: "Prayer Times", onClick: () => router.push(`/dashboard/masjids/${masjid.id}/settings?tab=prayer-times`), danger: false },
      ],
    },
    {
      items: [
        { icon: <Camera size={14} />, label: "Upload Cover Photo", onClick: () => router.push(`/dashboard/masjids/${masjid.id}/settings?tab=cover`), danger: false },
        { icon: <Pencil size={14} />, label: "Edit Facility", onClick: () => onEditFacility(masjid), danger: false },
      ],
    },
    {
      items: [
        { icon: <Trash2 size={14} />, label: "Delete Masjid", onClick: () => onDelete(masjid), danger: true },
      ],
    },
  ];

  if (!coords || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: visible ? 1 : 0, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -4 }}
        transition={{ duration: 0.15 }}
        role="menu"
        data-testid={`action-menu-${masjid.id}`}
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          zIndex: 9999,
          pointerEvents: visible ? "auto" : "none",
        }}
        className="w-52 bg-white rounded-xl shadow-xl border border-[#eaedff] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "border-t border-[#eaedff]")}>
            {group.items.map((a) => (
              <button
                key={a.label}
                role="menuitem"
                data-testid={`action-menu-item-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => {
                  a.onClick();
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left",
                  a.danger
                    ? "text-red-500 hover:bg-red-50"
                    : "text-[#131b2e] hover:bg-[#f2f3ff]"
                )}
              >
                <span className={cn(a.danger ? "text-red-400" : "text-slate-400")}>
                  {a.icon}
                </span>
                {a.label}
              </button>
            ))}
          </div>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}