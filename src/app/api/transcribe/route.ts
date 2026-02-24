import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
]);

export async function POST(request: Request) {
  // CSRF: verify request origin
  if (!verifyOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 30 transcriptions per IP per hour (using reliable IP)
  const ip = getClientIp(request);
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

    // Validate file type — check base MIME type (strip codec params like ";codecs=opus")
    const baseType = file.type.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(baseType)) {
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
