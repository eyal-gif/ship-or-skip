import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Validate slug format (alphanumeric, 10 chars)
  if (!/^[a-z0-9]{10}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  try {
    const [report] = await db
      .select()
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
