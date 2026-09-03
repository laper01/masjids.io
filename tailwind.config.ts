import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          green: "#10b981",
          "green-light": "#34d399",
          "green-dark": "#059669",
          "green-bg": "#ecfdf5",
          navy: "#0f172a",
          "navy-light": "#1e293b",
          "navy-mid": "#334155",
        },
        // Neutral palette
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-cal-sans)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "88": "22rem",
        "100": "25rem",
        "112": "28rem",
        "128": "32rem",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06)",
        "card-hover": "0 10px 40px -10px rgba(0,0,0,.15)",
        "green-glow": "0 0 30px -5px rgba(16,185,129,.35)",
        "navy-glow": "0 20px 60px -15px rgba(15,23,42,.5)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-grid": "linear-gradient(rgba(16,185,129,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.04) 1px, transparent 1px)",
        "dot-pattern": "radial-gradient(circle, rgba(16,185,129,.15) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-40": "40px 40px",
        "dot-20": "20px 20px",
      },
      animation: {
        "fade-in": "fadeIn .5s ease-out forwards",
        "slide-up": "slideUp .6s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
