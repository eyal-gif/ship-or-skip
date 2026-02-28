import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/schema";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";
import { createSessionSchema } from "@/lib/validations";

export async function POST(request: Request) {
  // CSRF: verify request origin
  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 20 sessions per IP per hour (using reliable IP)
  const ip = getClientIp(request);
  const { success } = rateLimit(`session:${ip}`, 20, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { ideaDescription } = parsed.data;

    const [session] = await db
      .insert(sessions)
      .values({ answers: { idea: ideaDescription } })
      .returning();

    return NextResponse.json({ sessionId: session.id });
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
