import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 60 reads per IP per minute
  const ip = getClientIp(request);
  const { success } = rateLimit(`report-read:${ip}`, 60, 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { slug } = await params;

  // Validate slug format (alphanumeric, 10 chars)
  if (!/^[a-z0-9]{10}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  try {
    // Select only public fields — exclude internal IDs (sessionId, leadId, id)
    const [report] = await db
      .select({
        slug: reports.slug,
        featureName: reports.featureName,
        companyName: reports.companyName,
        overallScore: reports.overallScore,
        verdict: reports.verdict,
        scores: reports.scores,
        reactions: reports.reactions,
        summary: reports.summary,
        companyDescription: reports.companyDescription,
        companySize: reports.companySize,
        companyIndustry: reports.companyIndustry,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.slug, slug))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
