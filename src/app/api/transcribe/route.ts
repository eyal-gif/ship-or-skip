import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/mp4", "audio/wav"];

export async function POST(request: Request) {
  // Rate limit: 30 transcriptions per IP per hour
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = rateLimit(`transcribe:${ip}`, 30, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.some((t) => file.type.startsWith(t.split("/")[0]))) {
      return NextResponse.json({ error: "Invalid audio format" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const text = await transcribeAudio(arrayBuffer, file.type);

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
