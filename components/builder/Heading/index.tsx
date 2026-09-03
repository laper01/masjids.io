// components/builder/Heading/index.tsx
"use client";

import { LEVEL_SIZE, PRESET_WEIGHT, COLOR_CLASS } from "./constants";
import type { HeadingProps } from "./types";
import type { ElementType } from "react";

/**
 * Heading — komponen judul dengan preset level, berat, dan warna.
 *
 * Di Reka AST komponen ini direferensikan sebagai:
 *   { type: "external", name: "Heading" }
 *
 * Leaf node — tidak menerima slot/children.
 *
 * Props:
 *  - text      → teks yang ditampilkan
 *  - level     → tag h1–h6 sekaligus ukuran (1 = terbesar)
 *  - preset    → ketebalan: "default" | "bold" | "light"
 *  - color     → warna: "default" | "emerald" | "slate" | "amber" | "rose" | "sky" | "violet"
 *  - className → override penuh dengan Tailwind class bebas
 */
export default function Heading({
  text = "Heading",
  level = 2,
  preset = "default",
  color = "default",
  className = "",
}: HeadingProps) {
  const Tag = `h${level}` as ElementType;

  const resolvedClass = className.trim()
    ? className.trim()
    : [
        LEVEL_SIZE[level],
        PRESET_WEIGHT[preset],
        COLOR_CLASS[color],
        "leading-tight tracking-tight",
      ].join(" ");

  return <Tag className={resolvedClass}>{text}</Tag>;
}