// app/(public)/public-masjids/[id]/personal-page/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useBuilderContent } from "@/hooks/useBuilder";
import { hydrateLayout } from "@/lib/builder/layout";
import { CanvasRenderer } from "@/components/builder/CanvasRenderer";
import { useMasjids } from "@/hooks/useMasjids";
import { MosqueProvider } from "@/context/MosqueContext";
import type { Mosque } from "@/types/masjid";

export default function PersonalPage() {
  const params = useParams<{ id: string }>();
  const masjidId = params.id;

  const { getMasjid } = useMasjids();
  const [masjid, setMasjid] = useState<Mosque | null>(null);
  const [masjidLoading, setMasjidLoading] = useState(true);

  useEffect(() => {
    if (!masjidId) return;
    getMasjid(masjidId)
      .then(setMasjid)
      .finally(() => setMasjidLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjidId]);

  const { data, loading, error } = useBuilderContent(masjidId);
  const nodes = useMemo(() => hydrateLayout(data), [data]);

  if (loading || masjidLoading) {
    return (
      <div data-testid="personal-page-loading" className="flex items-center justify-center h-[60vh] gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading page...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="personal-page-error" className="flex items-center justify-center h-[60vh] text-sm text-red-500">
        Failed to load page: {error}
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div data-testid="personal-page-empty" className="flex items-center justify-center h-[60vh] text-sm text-slate-400">
        This masjid hasn't published a page yet.
      </div>
    );
  }

  return (
    <MosqueProvider mosqueList={masjid ? [masjid] : []}>
      <div data-testid="personal-page-content" className="max-w-4xl mx-auto py-8 px-4">
        <CanvasRenderer nodes={nodes} />
      </div>
    </MosqueProvider>
  );
}