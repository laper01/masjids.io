// components/builder/QuoteBlock/types.ts

export type QuoteTheme  = "emerald" | "slate" | "amber" | "sky" | "rose";
export type QuoteLayout = "centered" | "left" | "card";

export interface QuoteBlockProps {
  /** Arabic text (Quran verse or hadith) — shown in large RTL text */
  arabic?: string;
  /** Translation / transliteration */
  translation?: string;
  /** Source reference e.g. "Surah Al-Baqarah 2:286" */
  source?: string;
  /** Color theme */
  theme?: QuoteTheme;
  /** Layout style */
  layout?: QuoteLayout;
  /** Show decorative quotation mark */
  showQuoteMark?: boolean;
  /** Free Tailwind override */
  className?: string;
}