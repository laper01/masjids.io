// components/builder/Heading/types.ts

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingPreset = "default" | "bold" | "light";

export type HeadingColor =
  | "default"
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "sky"
  | "violet";

export interface HeadingProps {
  /** Teks yang ditampilkan */
  text?: string;
  /** Tag HTML h1–h6 sekaligus ukuran font */
  level?: HeadingLevel;
  /** Ketebalan font: default = semibold, bold = extrabold, light = normal */
  preset?: HeadingPreset;
  /** Warna teks dari palette yang tersedia */
  color?: HeadingColor;
  /** Override bebas dengan Tailwind class — menimpa semua preset */
  className?: string;
}
