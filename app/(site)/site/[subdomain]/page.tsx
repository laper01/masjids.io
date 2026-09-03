// app/(public)/site/[subdomain]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Building2, SearchX, Sparkles } from "lucide-react";
import { hydrateLayout } from "@/lib/builder/layout";
import { CanvasRenderer } from "@/components/builder/CanvasRenderer";
import { MosqueProvider } from "@/context/MosqueContext";
import type { BuilderContent } from "@/types/builder";
import type { Mosque } from "@/types/masjid";

interface BySubdomainData extends BuilderContent {
  id: string;
  name: string;
  subdomain: string;
}

type PageState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error"; message: string }
  | { status: "empty"; content: BySubdomainData }
  | { status: "ready"; content: BySubdomainData };

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function MasjidSitePage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;

  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (!subdomain) return;
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/masjids/by-subdomain/${subdomain}`)
      .then(async (res) => {
        const result = await res.json();

        if (cancelled) return;

        if (res.status === 404 || result.success === false) {
          setState({ status: "not_found" });
          return;
        }

        const content = result.data as BySubdomainData;
        const hydratedNodes = hydrateLayout(content);

        if (!hydratedNodes || hydratedNodes.length === 0) {
          setState({ status: "empty", content });
        } else {
          setState({ status: "ready", content });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Failed to load this page.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  const nodes = useMemo(() => {
    if (state.status !== "ready") return null;
    return hydrateLayout(state.content);
  }, [state]);

  const masjid: Mosque | null =
    state.status === "ready" || state.status === "empty"
      ? ({
          id: state.content.id,
          name: state.content.name,
          subDomain: state.content.subdomain,
        } as Mosque)
      : null;

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-slate-400">
        <Loader2 size={22} className="animate-spin" />
        <span className="text-sm font-medium">Loading masjid page…</span>
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <PlaceholderScreen
        icon={<SearchX size={30} className="text-slate-400" />}
        iconBg="bg-slate-100"
        title="We couldn't find this masjid"
        description={`There's no page published at "${subdomain}". Double-check the address, or the masjid may not have joined masjids.io yet.`}
      />
    );
  }

  if (state.status === "error") {
    return (
      <PlaceholderScreen
        icon={<SearchX size={30} className="text-rose-400" />}
        iconBg="bg-rose-50"
        title="Something went wrong"
        description="We ran into a problem loading this page. Please try again in a moment."
      />
    );
  }

  if (state.status === "empty") {
    return (
      <PlaceholderScreen
        icon={<Building2 size={30} className="text-[#064e3b]" />}
        iconBg="bg-emerald-50"
        badge="Coming soon"
        title={`${state.content.name} is getting ready`}
        description="This masjid's website is being set up right now. Check back soon to see prayer times, events, and more."
        sparkle
      />
    );
  }

  return (
    <MosqueProvider mosqueList={masjid ? [masjid] : []}>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <CanvasRenderer nodes={nodes ?? []} />
      </div>
    </MosqueProvider>
  );
}

interface PlaceholderScreenProps {
  icon: React.ReactNode;
  iconBg: string;
  badge?: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
  sparkle?: boolean;
}

function PlaceholderScreen({
  icon,
  iconBg,
  badge,
  title,
  description,
  footer,
  sparkle = false,
}: PlaceholderScreenProps) {
  return (
    <div className="relative flex items-center justify-center min-h-screen px-6 overflow-hidden bg-gradient-to-b from-white to-slate-50">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[420px] h-[420px] rounded-full bg-emerald-100/40 blur-3xl" />
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="relative z-10 flex flex-col items-center text-center max-w-md"
      >
        <motion.div
          variants={fadeUp}
          custom={1}
          className={`relative w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${iconBg}`}
        >
          {icon}
          {sparkle && (
            <Sparkles
              size={14}
              className="absolute -top-1.5 -right-1.5 text-amber-400"
            />
          )}
        </motion.div>

        {badge && (
          <motion.span
            variants={fadeUp}
            custom={2}
            className="inline-block mb-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-[#064e3b] border border-emerald-100"
          >
            {badge}
          </motion.span>
        )}

        <motion.h1
          variants={fadeUp}
          custom={3}
          className="text-xl font-extrabold text-[#131b2e] mb-2"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          {title}
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={4}
          className="text-sm text-slate-500 leading-relaxed mb-5"
        >
          {description}
        </motion.p>

        {footer && (
          <motion.div variants={fadeUp} custom={5}>
            {footer}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}