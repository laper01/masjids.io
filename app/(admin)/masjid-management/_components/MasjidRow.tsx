import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Globe, ChevronRight, MoreVertical } from "lucide-react";
import type { Mosque } from "@/types/masjid";
import { MasjidAvatar } from "./MasjidAvatar";
import { VerificationBadge } from "./VerificationBadge";
import { ActionMenu } from "./ActionMenu";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { rowAnim } from "./animations";

export function MasjidRow({
  masjid,
  index,
  onSelect,
  onUploadCover,
  onEditFacility,
  onEdit,
  onDelete,
}: {
  masjid: Mosque;
  index: number;
  onSelect: (m: Mosque) => void;
  onUploadCover: (m: Mosque) => void;
  onEditFacility: (m: Mosque) => void;
    onEdit: (m: Mosque) => void;
  onDelete: (m: Mosque) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // FIX: the row's "⋮" menu → "Delete Masjid" used to call `onDelete`
  // directly — an irreversible delete with zero confirmation, unlike the
  // Detail Modal's delete button which already goes through
  // ConfirmDeleteDialog. Row-level delete now opens the same dialog first;
  // the actual `onDelete` (passed down from page.tsx, which hits the API
  // and shows the toast) only fires after the user confirms.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRowClick = useCallback(() => {
    onSelect(masjid);
  }, [onSelect, masjid]);

  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(masjid);
      setShowDeleteConfirm(false);
    } catch {
      // page.tsx's onDelete already surfaces an error toast on failure.
      // Keep the dialog open here so the user can retry or cancel instead
      // of silently closing on a failed delete.
    } finally {
      setIsDeleting(false);
    }
  }, [masjid, onDelete]);

  return (
    <motion.tr
      variants={rowAnim}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      layout
      data-testid={`masjid-row-${masjid.id}`}
      className="group border-b border-[#eaedff] hover:bg-[#f2f3ff]/50 transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      {/* Name & Brand */}
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <MasjidAvatar name={masjid.name} thumbnailUrl={masjid.thumbnailUrl} />
          <div className="min-w-0">
            <p
              className="font-bold text-[#131b2e] text-sm truncate max-w-[200px]"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {masjid.name}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
              {masjid.id.slice(0, 16)}…
            </p>
          </div>
        </div>
      </td>

      {/* Subdomain */}
      <td className="px-6 py-5">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaedff] text-[#003527] text-xs font-semibold rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://${masjid.subDomain}.masjids.io`, "_blank");
          }}
        >
          <Globe size={10} className="opacity-60" />
          {masjid.subDomain}.masjids.io
        </span>
      </td>

      {/* Location */}
      <td className="px-6 py-5">
        <div className="flex items-center gap-1.5 text-sm text-[#131b2e]">
          <MapPin size={12} className="text-slate-400 shrink-0" />
          <span className="truncate max-w-[160px]">{masjid.location}</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 ml-[18px]">{masjid.countryCode}</p>
      </td>

      {/* Verification
      <td className="px-6 py-5">
        <VerificationBadge verified={masjid.is_verified} />
      </td> */}

      {/* Actions */}
      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(masjid);
            }}
            aria-label={`View ${masjid.name}`}
            data-testid={`row-view-btn-${masjid.id}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white text-xs font-bold rounded-lg"
          >
            View
            <ChevronRight size={12} />
          </motion.button>

          <div className="relative">
            <button
              ref={menuBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-label={`More actions for ${masjid.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              data-testid={`row-menu-btn-${masjid.id}`}
              className="p-2 text-slate-400 hover:text-[#003527] hover:bg-white rounded-lg transition-all"
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <ActionMenu
                    masjid={masjid}
                    anchorRef={menuBtnRef}
                    onClose={() => setMenuOpen(false)}
                    onOpenDetail={() => onSelect(masjid)}
                    onUploadCover={onUploadCover}
                    onEditFacility={onEditFacility}
                    onDelete={handleDeleteRequest}
                  />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </td>

      {/* Confirm delete dialog — portaled to document.body since a <tr> can
          only validly contain <td>/<th> children; ConfirmDeleteDialog itself
          renders a fixed-position overlay, so this keeps DOM structure valid
          without changing its visual behavior. */}
      {showDeleteConfirm && typeof document !== "undefined" &&
        createPortal(
          // FIX: React portals move DOM placement to document.body, but
          // click events still bubble according to the REACT tree, not the
          // DOM tree — this dialog is still a React child of this <tr>.
          // Without stopPropagation here, clicking Cancel/Confirm bubbles
          // up to the row's onClick and fires onSelect(masjid), silently
          // opening the Detail Modal underneath. ActionMenu.tsx already
          // guards against this same issue the same way.
          <div onClick={(e) => e.stopPropagation()}>
            <AnimatePresence>
              <ConfirmDeleteDialog
                masjid={masjid}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
              />
            </AnimatePresence>
          </div>,
          document.body
        )}
    </motion.tr>
  );
}