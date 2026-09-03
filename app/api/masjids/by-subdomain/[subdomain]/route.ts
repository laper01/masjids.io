import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetMasjidBySubdomainResponse } from "@/types/builder";

interface RouteContext {
  params: Promise<{ subdomain: string }>;
}

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { subdomain } = await context.params;

  if (!subdomain) {
    return NextResponse.json(
      { success: false, message: "subdomain is required." },
      { status: 400 }
    );
  }

  const MOCK: GetMasjidBySubdomainResponse = {
    success: true,
    message: "Masjid resolved",
    data: {
      layout: { root: { type: "div", props: {}, children: [] } },
      version: 1,
      layoutUpdatedAt: new Date().toISOString(),
      publishedAt: null,
    },
  };

  return proxyGET<GetMasjidBySubdomainResponse>(
    req,
    `/masjids/by-subdomain/${subdomain}/layout`,   // ← ditambahkan /layout
    MOCK
  );
}