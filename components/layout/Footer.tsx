

/* ─── Footer link data ──────────────────────────────────────────── */
const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Integrations", href: "#integrations" },
      { label: "Solutions", href: "#solutions" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Forum", href: "#forum" },
      { label: "Events", href: "#events" },
      { label: "Non-profits", href: "#nonprofits" },
    ],
  },
  {
    title: "Education",
    links: [
      { label: "Best Practices", href: "#best-practices" },
      { label: "Case Studies", href: "#case-studies" },
      { label: "Blog", href: "#blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#privacy" },
      { label: "Terms of Service", href: "#terms" },
    ],
  },
] as const;

/* ─── Footer Logo ───────────────────────────────────────────────── */
function FooterLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-brand-green flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1C5.79 1 4 2.79 4 5H12C12 2.79 10.21 1 8 1Z" fill="white" />
          <rect x="2" y="4" width="1.5" height="6" rx=".5" fill="white" />
          <rect x="12.5" y="4" width="1.5" height="6" rx=".5" fill="white" />
          <rect x="3" y="5" width="10" height="6" rx="1" fill="white" />
          <path d="M6.5 11V8.5C6.5 7.67 7.17 7 8 7C8.83 7 9.5 7.67 9.5 8.5V11H6.5Z" fill="#10b981" />
          <rect x="1.5" y="11" width="13" height="1.5" rx=".5" fill="white" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-white">masjids.io</span>
    </div>
  );
}

/* ─── Social Icons ──────────────────────────────────────────────── */
function SocialIcons() {
  return (
    <div className="flex items-center gap-3 mt-4" aria-label="Social media links">
      {/* Twitter/X */}
      <a
        href="#twitter"
        aria-label="Twitter"
        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/60 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      {/* Instagram */}
      <a
        href="#instagram"
        aria-label="Instagram"
        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/60 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
      {/* LinkedIn */}
      <a
        href="#linkedin"
        aria-label="LinkedIn"
        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/60 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
    </div>
  );
}

/* ─── Footer Component ──────────────────────────────────────────── */
export default function Footer() {
  return (
    <footer
      role="contentinfo"
      className="bg-neutral-900 text-white pt-16 pb-8"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <FooterLogo />
            <p className="mt-3 text-xs text-white/40 leading-relaxed max-w-[180px]">
              A digital sanctuary for the modern ummah. Powering communities with purpose.
            </p>
            <SocialIcons />
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5" role="list">
                {col.links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} masjids.io — A Sanctuary Project
          </p>
          <p className="text-xs text-white/20">
            Built with ♥ for the Ummah
          </p>
        </div>
      </div>
    </footer>
  );
}
