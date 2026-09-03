import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import BentoGrid from "@/components/BentoGrid";
import WebsiteBuilder from "@/components/WebsiteBuilder";
import ProtocolsSection from "@/components/ProtocolsSection";
import DirectorySection from "@/components/DirectorySection";
import Footer from "@/components/Footer";

/**
 * masjids.io — Landing Page
 *
 * Sections (in order):
 * 1. Navbar       — Sticky frosted-glass navigation
 * 2. HeroSection  — Full-bleed dark hero with dashboard mockup
 * 3. BentoGrid    — Feature showcase in bento card layout
 * 4. WebsiteBuilder — No-code website builder highlight
 * 5. ProtocolsSection — Institutional trust protocol steps
 * 6. DirectorySection — Global masjid directory preview
 * 7. Footer       — Brand, nav columns, social, status
 */
export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <BentoGrid />
      <WebsiteBuilder />
      <ProtocolsSection />
      <DirectorySection />
      <Footer />
    </main>
  );
}
