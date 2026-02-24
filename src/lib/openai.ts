import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes("webm") ? "webm" : "mp3";
  const file = new File([new Uint8Array(audioBuffer)], `audio.${ext}`, { type: mimeType });

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
  });

  return response.text;
}

export async function enrichCompany(domain: string): Promise<{
  company_name: string;
  description: string;
  size: string;
  industry: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You respond only with valid JSON. No markdown, no explanation.",
      },
      {
        role: "user",
        content: `Given the company domain "${domain}", provide:
- company_name: string
- description: one sentence about what they do
- size: "startup" | "smb" | "mid-market" | "enterprise"
- industry: string

If you can't determine any field, use "Unknown".
Respond as JSON only.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 200,
  });

  let companyText = response.choices[0]?.message?.content || "{}";
  companyText = companyText.trim();
  if (companyText.startsWith("```")) {
    companyText = companyText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }
  try {
    return JSON.parse(companyText);
  } catch {
    return {
      company_name: "Unknown",
      description: "Unknown",
      size: "Unknown",
      industry: "Unknown",
    };
  }
}

interface ScoreItem {
  dimension: string;
  score: number;
  detail: string;
}

interface ReactionItem {
  name: string;
  role: string;
  company: string;
  reaction: string;
  stance: "supportive" | "cautious" | "critical";
}

export interface ReportResult {
  feature_name: string;
  overall_score: number;
  verdict: string;
  summary: string;
  scores: ScoreItem[];
  reactions: ReactionItem[];
}

export async function generateReport(
  answers: Record<string, string | null>,
  companyData: { company_name: string; description: string; size: string; industry: string } | null
): Promise<ReportResult> {
  const company = companyData || {
    company_name: "Unknown",
    description: "Unknown",
    size: "Unknown",
    industry: "Unknown",
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a senior product advisor. Respond only with valid JSON.

CRITICAL RULES:
- ONLY reference information the user actually provided. NEVER invent, assume, or hallucinate features, details, or data the user did not explicitly state.
- If a question was skipped, say "No information provided" in the detail — do NOT guess what the user might have meant.
- The feature_name must come directly from what the user described in Q1. Do NOT make up a different feature name.
- Score skipped questions LOW (1-3) and explicitly note the missing information.`,
      },
      {
        role: "user",
        content: `Score this feature idea based ONLY on what was provided below. Do NOT invent or assume any details.

CONTEXT:
- Company: ${company.company_name} (${company.description}, ${company.size}, ${company.industry})
- Q1 — Feature & problem (REQUIRED): ${answers.q1 || "(skipped)"}
- Q2 — Supporting data: ${answers.q2 || "(not provided)"}
- Q3 — Expected impact: ${answers.q3 || "(not provided)"}
- Q4 — Target persona: ${answers.q4 || "(not provided)"}
- Q5 — Success measurement: ${answers.q5 || "(not provided)"}

RULES:
- Any answer marked "(not provided)" was skipped. Score that dimension 1-3 and note "No information provided."
- Do NOT guess or fill in gaps. Only reference what the user actually said.
- feature_name: Extract directly from Q1. Use the user's own words, shortened to 2-5 words.

SCORE across exactly 5 dimensions, each 1-10:

1. Problem Severity — Is this a real, painful problem? Is it urgent?
2. Evidence Quality — Is there data backing this up, or is it a hunch?
3. Strategic Fit — Does this align with the company's stage, audience, and goals?
4. Impact Potential — If built, how much will this move the needle?
5. Measurement Readiness — Can they actually measure if this works?

For each dimension provide:
- dimension: string (the name)
- score: integer 1-10
- detail: one sentence explaining the score (reference ONLY what the user said, or note the gap)

Also provide:
- feature_name: a clean 2-5 word name extracted from Q1
- overall_score: weighted average (round to 1 decimal)
- verdict: "BUILD IT" if >= 7.0, "SKIP IT" if < 5.0, "NEEDS WORK" if 5.0-6.9
- summary: 1-2 sentences, direct, actionable. Reference only provided info.

EXPERT REACTIONS:
Generate exactly 3 fictional product leader reactions as if from podcast interviews. Each should:
- Have a realistic name, role (VP Product, CPO, Head of Product, etc.), and company name
- Give a 1-2 sentence reaction to this specific feature idea, referencing the user's actual answers
- Have a stance: "supportive", "cautious", or "critical" — vary them across the 3 experts
- Sound like real product leaders giving honest, specific feedback — not generic platitudes
- Reference the company context and specific details from the user's answers

Respond as JSON: { feature_name, overall_score, verdict, summary, scores: [{ dimension, score, detail }], reactions: [{ name, role, company, reaction, stance }] }`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 2000,
  });

  let text = response.choices[0]?.message?.content || "{}";

  // Strip markdown code fences if present (GPT often wraps JSON in ```json ... ```)
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(text);
    // Ensure reactions array exists
    if (!parsed.reactions || !Array.isArray(parsed.reactions)) {
      parsed.reactions = [];
    }
    return parsed;
  } catch {
    return {
      feature_name: "Feature Analysis",
      overall_score: 5.0,
      verdict: "NEEDS WORK",
      summary: "Unable to generate a detailed analysis. Please try again.",
      scores: [
        { dimension: "Problem Severity", score: 5, detail: "Insufficient data to score." },
        { dimension: "Evidence Quality", score: 5, detail: "Insufficient data to score." },
        { dimension: "Strategic Fit", score: 5, detail: "Insufficient data to score." },
        { dimension: "Impact Potential", score: 5, detail: "Insufficient data to score." },
        { dimension: "Measurement Readiness", score: 5, detail: "Insufficient data to score." },
      ],
      reactions: [],
    };
  }
}
