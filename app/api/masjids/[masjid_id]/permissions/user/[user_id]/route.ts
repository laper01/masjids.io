/**
 * app/api/masjids/[masjid_id]/permissions/user/[user_id]/route.ts
 * PERM-08 · GET /masjids/:masjid_id/permissions/user/:user_id
 * Returns effective permission set for a specific user
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetUserEffectivePermissionsResponse } from "@/types/api";

interface RouteContext {
  params: Promise<{ masjid_id: string; user_id: string }>;
}

const MOCK_DATA = (userId: string): GetUserEffectivePermissionsResponse => ({
  success: true,
  message: "Effective permission set retrieved",
  data: {
    user_id:      userId,
    display_name: "Masjid Member",
    role_template: { id: "", name: "Custom Role", is_system: false },
    effective_scopes: [
      "masjid:profile:edit", "events:manage", "elections:create",
      "members:export", "donations:manage", "website:edit",
      "events:create", "elections:vote", "donations:report",
      "elections:manage", "members:verify", "announcements:delete",
      "donations:view", "website:domains", "website:manage",
      "masjid:settings:manage", "members:view", "notifications:send",
      "notifications:manage", "donations:refund", "payouts:manage",
      "website:view", "permissions:manage", "members:manage",
      "announcements:create", "website:publish", "facilities:book",
      "elections:view_results", "audit:view",
    ],
    granted_overrides: null,
    revoked_overrides: null,
    computed_at: new Date().toISOString(),
  },
});

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { masjid_id, user_id } = await context.params;

  if (!masjid_id || !user_id) {
    return NextResponse.json(
      { success: false, message: "Missing required parameters." },
      { status: 400 }
    );
  }

  return proxyGET<GetUserEffectivePermissionsResponse>(
    req,
    `/masjids/${masjid_id}/permissions/user/${user_id}`,
    MOCK_DATA(user_id)
  );
}