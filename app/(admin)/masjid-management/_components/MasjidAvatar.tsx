import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-[#003527] to-[#064e3b]",
  "from-[#1f2f43] to-[#35455a]",
  "from-[#38485d] to-[#515f74]",
  "from-[#064e3b] to-[#0b513d]",
];

export function MasjidAvatar({
  name,
  thumbnailUrl,
  size = "md",
}: {
  name: string;
  thumbnailUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const sizeClass =
    size === "lg"
      ? "h-16 w-16 rounded-2xl text-xl"
      : size === "sm"
        ? "h-8 w-8 rounded-lg text-xs"
        : "h-11 w-11 rounded-xl text-sm";

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={name}
        className={cn(sizeClass, "object-cover shrink-0")}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-br shrink-0 flex items-center justify-center text-white font-extrabold",
        AVATAR_COLORS[colorIdx],
        sizeClass
      )}
    >
      {initials}
    </div>
  );
}
