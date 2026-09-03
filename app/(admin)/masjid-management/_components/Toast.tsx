import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toast({
  message,
  type = "success",
}: {
  message: string;
  type?: "success" | "error";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      role="status"
      aria-live="polite"
      data-testid={`toast-${type}`}
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl whitespace-nowrap",
        type === "success"
          ? "bg-[#003527] text-white"
          : "bg-red-500 text-white"
      )}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {message}
    </motion.div>
  );
}