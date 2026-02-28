import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, sessions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createLeadSchema } from "@/lib/validations";
import { enrichCompany } from "@/lib/openai";
import { extractDomain } from "@/lib/utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyOrigin, sanitizeDomain } from "@/lib/security";
import { notifyNewLead } from "@/lib/telegram";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "live.com", "icloud.com", "aol.com", "protonmail.com",
]);

export async function POST(request: Request) {
  // CSRF: verify request origin
  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { success } = rateLimit(`lead:${ip}`, 10, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      // Don't leak validation details to client
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { sessionId, email, name, image } = parsed.data;

    // Verify session exists
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Sanitize domain before passing to LLM
    const rawDomain = extractDomain(email);
    const domain = sanitizeDomain(rawDomain);

    // Enrich company data (skip free email providers)
    let companyData = null;
    if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
      try {
        companyData = await enrichCompany(domain);
      } catch {
        // Non-blocking: proceed without enrichment
      }
    }

    const [lead] = await db
      .insert(leads)
      .values({
        sessionId,
        email,
        name: name || null,
        image: image || null,
        domain,
        companyData,
      })
      .returning();

    // Update session status
    await db
      .update(sessions)
      .set({ status: "email_captured" })
      .where(eq(sessions.id, sessionId));

    // Telegram notification (fire-and-forget)
    const companyName = (companyData as { company_name?: string } | null)?.company_name || null;
    notifyNewLead({
      name: name || null,
      email,
      domain,
      companyName,
      featureName: null, // not yet available — report hasn't been generated
    }).catch(() => {});

    return NextResponse.json({
      leadId: lead.id,
      domain,
      companyData,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
