import { motion } from "framer-motion";
import { Building2, Plus } from "lucide-react";

export function EmptyState({ search, onAdd }: { search: string; onAdd: () => void }) {
  return (
    <tr>
      <td colSpan={5}>
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[#f2f3ff] mb-4">
            <Building2 size={28} className="text-[#003527]/30" />
          </div>
          <p
            className="text-base font-bold text-[#131b2e] mb-1"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {search ? "No masjids found" : "No masjids yet"}
          </p>
          <p className="text-sm text-slate-400 mb-6">
            {search
              ? `No results matching "${search}"`
              : "Register your first masjid to get started"}
          </p>
          {!search && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAdd}
              data-testid="empty-state-register-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white text-sm font-bold rounded-xl"
            >
              <Plus size={15} />
              Register Masjid
            </motion.button>
          )}
        </div>
      </td>
    </tr>
  );
}