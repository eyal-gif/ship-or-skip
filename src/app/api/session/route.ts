import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/schema";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit: 20 sessions per IP per hour
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = rateLimit(`session:${ip}`, 20, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const [session] = await db.insert(sessions).values({}).returning();
    return NextResponse.json({ sessionId: session.id });
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
