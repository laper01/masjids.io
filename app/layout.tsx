import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/app/providers";

// --- Font Configuration ---
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

// --- SEO & Open Graph Metadata ---
export const metadata: Metadata = {
  title: "masjids.io | The Institutional OS for the Ummah",
  description:
    "A unified platform for governance, finance, and community engagement. Built for the sacred mission of the modern masjid. Powering 12,400+ centers worldwide.",
  keywords: [
    "masjid",
    "mosque",
    "Islamic center",
    "community platform",
    "Muslim community",
    "governance",
    "donations",
    "prayer times",
    "ummah",
  ],
  authors: [{ name: "masjids.io" }],
  creator: "masjids.io",
  publisher: "masjids.io",
  metadataBase: new URL("https://masjids.io"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://masjids.io",
    title: "masjids.io | The Institutional OS for the Ummah",
    description:
      "A unified platform for governance, finance, and community engagement. Built for the sacred mission of the modern masjid.",
    siteName: "masjids.io",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "masjids.io — The Institutional OS for the Ummah",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "masjids.io | The Institutional OS for the Ummah",
    description:
      "A unified platform for governance, finance, and community engagement. Built for the sacred mission of the modern masjid.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// --- Root Layout ---
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} scroll-smooth`}
    >
      <head>
        {/* Material Symbols icon font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-body bg-background text-on-surface antialiased">
        {/* ✅ Providers wraps everything — includes SessionProvider for useSession() */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}