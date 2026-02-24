import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, leads, reports } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateReportSchema } from "@/lib/validations";
import { generateReport } from "@/lib/openai";
import { generateSlug } from "@/lib/utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";

export async function POST(request: Request) {
  // CSRF: verify request origin
  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { success } = rateLimit(`report:${ip}`, 10, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = generateReportSchema.safeParse(body);

    if (!parsed.success) {
      // Don't leak validation details to client
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { sessionId, leadId } = parsed.data;

    // Fetch session and lead
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!session || !lead) {
      return NextResponse.json({ error: "Session or lead not found" }, { status: 404 });
    }

    // IDOR fix: verify lead belongs to this session
    if (lead.sessionId !== sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answers = session.answers as Record<string, string | null>;

    // Require at least Q1 (feature description) — can't score nothing
    if (!answers.q1 || answers.q1.trim().length === 0) {
      return NextResponse.json(
        { error: "Please describe your feature before generating a report (Question 1 is required)." },
        { status: 400 }
      );
    }

    const companyData = lead.companyData as {
      company_name: string;
      description: string;
      size: string;
      industry: string;
    } | null;

    // Generate report via LLM
    const result = await generateReport(answers, companyData);

    const slug = generateSlug();

    const [report] = await db
      .insert(reports)
      .values({
        sessionId,
        leadId,
        slug,
        featureName: result.feature_name,
        companyName: companyData?.company_name || null,
        overallScore: String(result.overall_score),
        verdict: result.verdict,
        scores: result.scores,
        reactions: result.reactions || [],
        summary: result.summary,
        companyDescription: companyData?.description || null,
        companySize: companyData?.size || null,
        companyIndustry: companyData?.industry || null,
      })
      .returning();

    // Update session status
    await db
      .update(sessions)
      .set({ status: "report_generated" })
      .where(eq(sessions.id, sessionId));

    return NextResponse.json({ slug: report.slug, report: result });
  } catch {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
