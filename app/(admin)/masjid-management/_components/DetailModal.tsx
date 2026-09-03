import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Globe,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Languages,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mosque } from "@/types/masjid";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { MasjidAvatar } from "./MasjidAvatar";
import { AmenityChip } from "./AmenityChip";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { modalAnim } from "./animations";

export function DetailModal({
  masjid,
  onClose,
  onDelete,
  onEditFacility,
  onEdit,
}: {
  masjid: Mosque;
  onClose: () => void;
  onDelete: (masjid: Mosque) => void;
  onEditFacility: (masjid: Mosque) => void;
  onEdit: (masjid: Mosque) => void;
}) {
  const router = useRouter();
  const {
    coverPhoto: coverPhotoResponse,
    facility: facilityResponse,
    loading: isLoading,
    getCoverPhoto,
    getFacility,
  } = useMasjidMedia();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCoverPhoto(masjid.id);
    getFacility(masjid.id);
  }, [masjid.id, getCoverPhoto, getFacility]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    await onDelete(masjid);
    setIsDeleting(false);
    onClose();
  }, [masjid, onDelete, onClose]);

  const coverPhoto = coverPhotoResponse?.data ?? null;
  const facility = facilityResponse?.data ?? null;

  const enabledAmenities = facility
    ? (Object.entries(facility.amenities) as [string, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k)
    : [];

  const heroUrl = coverPhoto?.cover_photo_url ?? masjid.imageUrl ?? masjid.thumbnailUrl;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-[#131b2e]/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          variants={modalAnim}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="masjid-detail-title"
          data-testid="masjid-detail-modal"
          className="relative z-10 w-full sm:max-w-lg bg-white sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col"
        >
          <div className="relative h-44 shrink-0 bg-gradient-to-br from-[#003527] to-[#064e3b] overflow-hidden">
            {isLoading ? (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#003527]/80 to-[#064e3b]/80" />
            ) : heroUrl ? (
              <img
                src={heroUrl}
                alt={masjid.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
                <ImageOff size={32} className="text-white" />
                <span className="text-white text-xs font-medium">No cover photo</span>
              </div>
            )}

            <button
              onClick={onClose}
              aria-label="Close"
              data-testid="masjid-detail-close-btn"
              className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-lg text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="overflow-y-auto flex-1">
            <div className="px-6 pt-5 pb-6 space-y-5">

              <div className="flex items-start gap-4">
                <MasjidAvatar
                  name={masjid.name}
                  thumbnailUrl={masjid.thumbnailUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h2
                    id="masjid-detail-title"
                    className="text-lg font-extrabold text-[#131b2e] leading-tight"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {masjid.name}
                  </h2>
                  <a
                    href={`https://${masjid.subDomain}.masjids.io`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#064e3b] font-semibold mt-0.5 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe size={10} className="opacity-60" />
                    {masjid.subDomain}.masjids.io
                  </a>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} />
                    {masjid.address || masjid.location}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-20 bg-[#eaedff] rounded" />
                  <div className="h-12 bg-[#f2f3ff] rounded-xl" />
                </div>
              ) : facility ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Capacity
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Main Hall", value: facility.capacity.main_hall },
                      { label: "Women's", value: facility.capacity.womens_section },
                      { label: "Total", value: facility.capacity.total, accent: true },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className={cn(
                          "rounded-xl p-3 text-center",
                          c.accent
                            ? "bg-[#003527] text-white"
                            : "bg-[#f2f3ff] text-[#131b2e]"
                        )}
                      >
                        <p
                          className="text-xl font-extrabold leading-none"
                          style={{ fontFamily: "Manrope, sans-serif" }}
                        >
                          {c.value.toLocaleString()}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] font-medium mt-1",
                            c.accent ? "text-white/70" : "text-slate-400"
                          )}
                        >
                          {c.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {facility && facility.languages.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Languages
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {facility.languages.map((lang: string) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#eaedff] text-[#131b2e] text-xs font-semibold rounded-lg"
                      >
                        <Languages size={10} className="text-[#003527]" />
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {facility && facility.services.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Services
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {facility.services.map((svc: string) => (
                      <span
                        key={svc}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#003527]/8 text-[#003527] text-xs font-semibold rounded-lg border border-[#003527]/10"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {enabledAmenities.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Amenities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledAmenities.map((key) => (
                      <AmenityChip key={key} amenityKey={key} />
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && !facility && (
                <div className="flex flex-col items-center py-4 gap-2">
                  <p className="text-sm text-slate-400">No facility data yet</p>
                  <button
                    onClick={() => onEditFacility(masjid)}
                    className="text-xs text-[#064e3b] font-bold hover:underline"
                  >
                    + Add facility information
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-[#eaedff] text-xs text-slate-400">
                <span>
                  ID: <span className="font-mono text-[#131b2e]">{masjid.id.slice(0, 16)}…</span>
                </span>
                <span>
                  Country: <span className="font-semibold text-[#131b2e]">{masjid.countryCode}</span>
                </span>
                {facility && (
                  <button
                    onClick={() => onEditFacility(masjid)}
                    className="inline-flex items-center gap-1 text-[#064e3b] font-semibold hover:underline"
                  >
                    <Pencil size={10} />
                    Edit Facility
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#eaedff] bg-[#f2f3ff]/40 flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete masjid"
              data-testid="detail-delete-btn"
              className="p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete masjid"
            >
              <Trash2 size={16} />
            </button>

            <button
              onClick={() => { onEdit(masjid); onClose(); }}
              aria-label="Edit masjid"
              data-testid="detail-edit-btn"
            >
              <Pencil size={13} />
            </button>

            <div className="flex-1" />

            <button
              onClick={onClose}
              data-testid="detail-close-btn"
              className="px-4 py-2.5 border border-[#eaedff] text-[#131b2e] text-sm font-bold rounded-xl hover:bg-white transition-colors"
            >
              Close
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onClose();
                router.push(`/dashboard/masjids/${masjid.id}/settings`);
              }}
              data-testid="detail-manage-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white text-sm font-bold rounded-xl"
              style={{ boxShadow: "0 4px 16px -4px rgba(0,53,39,0.35)" }}
            >
              Manage
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDeleteDialog
            masjid={masjid}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}