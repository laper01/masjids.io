# Masjids.io — Landing Page

A production-ready landing page clone built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Framer Motion**.

---

## 🚀 Quick Start

### Prerequisites
- Node.js **18.17+**
- npm **9+** (or yarn / pnpm)

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build
```bash
npm run build
```

### Production Start
```bash
npm run start
```

### Lint
```bash
npm run lint
```

---

## 📁 Project Structure

```
masjids-landing/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout — fonts, metadata, viewport
│   └── page.tsx                # Home page — assembles all sections
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Sticky header with mobile menu
│   │   └── Footer.tsx          # Footer with link columns
│   └── sections/
│       ├── HeroSection.tsx     # Hero headline + CTAs + donation widget
│       ├── FeaturesSection.tsx # 4-card feature grid (Governance, Finance, Ping, Member)
│       ├── BuilderSection.tsx  # No-code builder showcase
│       ├── TrustSection.tsx    # 3-step trust protocol
│       └── DirectorySection.tsx# Mosque search + cards
├── lib/
│   └── utils.ts                # cn(), formatCurrency(), helpers
├── styles/
│   └── globals.css             # Tailwind base + design tokens + utility classes
├── public/                     # Static assets (favicon, OG image, etc.)
├── tailwind.config.ts          # Extended design system
├── next.config.ts              # Next.js config
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## 🎨 Design System

### Colors
| Token | Value | Usage |
|---|---|---|
| `brand-green` | `#10b981` | Primary accent, CTAs, highlights |
| `brand-green-light` | `#34d399` | Hover states |
| `brand-green-dark` | `#059669` | Active states |
| `brand-navy` | `#0f172a` | Dark backgrounds, text |
| `neutral-50–950` | Scale | Grays for UI elements |

### Typography
- **Display:** Geist Sans (bold headings)
- **Body:** Geist Sans (body text)
- **Mono:** Geist Mono (code, IDs)

### Shadows
- `shadow-card` — subtle card lift
- `shadow-card-hover` — elevated hover state
- `shadow-green-glow` — green accent glow
- `shadow-navy-glow` — dark card shadow

---

## ♿ Accessibility
- Semantic HTML (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`, `<article>`)
- All interactive elements have descriptive `aria-label` attributes
- Progress bars use `role="progressbar"` with `aria-valuenow/min/max`
- Skip-to-content support via `tabIndex={-1}` on `<main>`
- Focus-visible ring using brand green
- Color contrast meets WCAG AA

---

## 🌐 Deployment

### Vercel (Recommended)
```bash
npx vercel
```
Or connect your GitHub repo at [vercel.com](https://vercel.com).

### Netlify
```bash
npm run build
# Deploy the .next/ folder
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🛠 Extending the Project

- **Add a new section:** Create `components/sections/NewSection.tsx`, import in `app/page.tsx`
- **Change brand color:** Update `brand.green` in `tailwind.config.ts`
- **Add fonts:** Update `app/layout.tsx` and `--font-*` CSS variables
- **SEO:** Edit `metadata` object in `app/layout.tsx`
- **New pages:** Create `app/new-page/page.tsx`

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 15.1 | Framework |
| `react` | 19 | UI library |
| `framer-motion` | 11 | Animations |
| `tailwindcss` | 3.4 | Styling |
| `lucide-react` | 0.468 | Icons |
| `clsx` + `tailwind-merge` | latest | Class merging |

---

Built with ♥ for the Ummah.
