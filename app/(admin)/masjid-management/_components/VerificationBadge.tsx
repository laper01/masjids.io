import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
        verified
          ? "bg-[#b0f0d6]/40 text-[#003527]"
          : "bg-[#f2f3ff] text-slate-400"
      )}
    >
      {verified ? (
        <CheckCircle2 size={11} className="text-[#064e3b]" />
      ) : (
        <XCircle size={11} />
      )}
      {verified ? "Verified" : "Pending"}
    </div>
  );
}
