import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, sessions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createLeadSchema } from "@/lib/validations";
import { enrichCompany } from "@/lib/openai";
import { extractDomain } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = rateLimit(`lead:${ip}`, 10, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
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

    const domain = extractDomain(email);

    // Enrich company data
    let companyData = null;
    if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)) {
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

    return NextResponse.json({
      leadId: lead.id,
      domain,
      companyData,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
