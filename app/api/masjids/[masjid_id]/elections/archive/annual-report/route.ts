/**
 * ARC-03  GET /api/masjids/:masjid_id/elections/archive/annual-report?year=2026&format=pdf
 * Async PDF/CSV/JSON report generation. Returns job_id for polling.
 * Returns download_url immediately if report is cached.
 * Auth: Bearer JWT · elections:read
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetAnnualReportResponse, ReportFormat } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string }>; }

const VALID_FORMATS: Set<ReportFormat> = new Set(["pdf", "csv", "json"]);

const MOCK: GetAnnualReportResponse = {
  success: true,
  message: "Annual report generation queued.",
  data: {
    job_id: "report-job-uuid-0001",
    year: 2026,
    format: "pdf",
    status: "generating",
    poll_url: "/api/jobs/report-job-uuid-0001/status",
    queued_at: "2026-05-06T15:00:00Z",
  },
};

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id) return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const formatParam = searchParams.get("format") ?? "pdf";

    if (!yearParam) return NextResponse.json({ success: false, message: "Validation failed.", errors: { year: ["year query parameter is required."] } }, { status: 422 });
    const year = Number(yearParam);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return NextResponse.json({ success: false, message: "Validation failed.", errors: { year: ["year must be a valid 4-digit year."] } }, { status: 422 });
    if (!VALID_FORMATS.has(formatParam as ReportFormat)) return NextResponse.json({ success: false, message: `Invalid format: "${formatParam}".`, errors: { format: [`Must be one of: ${[...VALID_FORMATS].join(", ")}.`] } }, { status: 422 });

    return proxyGET<GetAnnualReportResponse>(req, `/masjids/${masjid_id}/elections/archive/annual-report`, MOCK);
  } catch (error) {
    console.error("[ARC-03]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
