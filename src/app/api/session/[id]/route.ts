import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { updateSessionSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  // Rate limit: 50 updates per session per hour
  const { success } = rateLimit(`session-update:${id}`, 50, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = updateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { questionKey, answer } = parsed.data;

    // Use jsonb_set to update only the specific question key
    const [updated] = await db
      .update(sessions)
      .set({
        answers: sql`jsonb_set(COALESCE(${sessions.answers}, '{}'::jsonb), ${`{${questionKey}}`}, ${JSON.stringify(answer)}::jsonb)`,
      })
      .where(eq(sessions.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
