"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Community", href: "#community" },
  { label: "Pricing", href: "#pricing" },
] as const;

function MosqueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1C5.79 1 4 2.79 4 5H12C12 2.79 10.21 1 8 1Z" fill="white" />
      <rect x="2" y="4" width="1.5" height="6" rx=".5" fill="white" />
      <rect x="12.5" y="4" width="1.5" height="6" rx=".5" fill="white" />
      <rect x="3" y="5" width="10" height="6" rx="1" fill="white" />
      <path d="M6.5 11V8.5C6.5 7.67 7.17 7 8 7C8.83 7 9.5 7.67 9.5 8.5V11H6.5Z" fill="#10b981" />
      <rect x="1.5" y="11" width="13" height="1.5" rx=".5" fill="white" />
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 focus-visible:outline-none" aria-label="Masjids.io Home">
      <div className="w-7 h-7 rounded-lg bg-brand-green flex items-center justify-center shadow-sm">
        <MosqueIcon />
      </div>
      <span className="text-[15px] font-semibold text-neutral-900 tracking-tight">masjids.io</span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header
      role="banner"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-neutral-100 shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav role="navigation" aria-label="Main navigation" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          <ul className="hidden md:flex items-center gap-1" role="list">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors duration-150"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              Sign In
            </a>
            <a
              href="/register"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Register
            </a>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="md:hidden overflow-hidden bg-white border-b border-neutral-100"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  {label}
                </a>
              ))}
              <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
                <a href="#signin" className="block px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors">
                  Sign In
                </a>
                <a href="#register" className="block px-4 py-3 text-sm font-semibold text-white bg-neutral-900 rounded-lg text-center hover:bg-neutral-800 transition-colors">
                  Register
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
