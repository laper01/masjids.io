import { motion } from "framer-motion";
import { Trash2, Loader2 } from "lucide-react";
import type { Mosque } from "@/types/masjid";

export function ConfirmDeleteDialog({
  masjid,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  masjid: Mosque;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-[#131b2e]/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        data-testid="confirm-delete-dialog"
        className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-red-50 mb-4 mx-auto">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3
          id="confirm-delete-title"
          className="text-center text-base font-extrabold text-[#131b2e] mb-1"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Delete Masjid?
        </h3>
        <p className="text-center text-sm text-slate-500 mb-6">
          This will permanently remove{" "}
          <span className="font-bold text-[#131b2e]">{masjid.name}</span>. This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            data-testid="confirm-delete-cancel-btn"
            className="flex-1 px-4 py-2.5 border border-[#eaedff] text-[#131b2e] text-sm font-bold rounded-xl hover:bg-[#f2f3ff] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="confirm-delete-confirm-btn"
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}