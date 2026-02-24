import OpenAI from "openai";
import { findRelevantExperts, type PodcastExpertContext } from "./podcast-rag";
import { validateReportOutput, validateCompanyOutput, sanitizeDomain } from "./security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cap total prompt content to prevent cost amplification
const MAX_ANSWER_LEN = 2000;
function cap(s: string | null, fallback: string): string {
  if (!s) return fallback;
  return s.length > MAX_ANSWER_LEN ? s.slice(0, MAX_ANSWER_LEN) + "..." : s;
}

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
  // Sanitize domain to prevent prompt injection
  const safeDomain = sanitizeDomain(domain);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You respond only with valid JSON. No markdown, no explanation.",
      },
      {
        role: "user",
        content: `Given the company domain "${safeDomain}", provide:
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
    const raw = JSON.parse(companyText);
    // Validate & clamp LLM output
    return validateCompanyOutput(raw);
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

  const featureDescription = cap(answers.q1, "");

  // Run scoring and podcast RAG in parallel for speed
  const [scoreResponse, podcastExperts] = await Promise.all([
    // 1. Score the feature via LLM
    openai.chat.completions.create({
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
          // User answers are capped and wrapped in XML-style delimiters
          // to reduce prompt injection risk
          content: `Score this feature idea based ONLY on what was provided below. Do NOT invent or assume any details.

CONTEXT:
- Company: ${company.company_name} (${company.description}, ${company.size}, ${company.industry})

<user_answers>
- Q1 — Feature & problem (REQUIRED): ${cap(answers.q1, "(skipped)")}
- Q2 — Supporting data: ${cap(answers.q2, "(not provided)")}
- Q3 — Expected impact: ${cap(answers.q3, "(not provided)")}
- Q4 — Target persona: ${cap(answers.q4, "(not provided)")}
- Q5 — Success measurement: ${cap(answers.q5, "(not provided)")}
</user_answers>

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

Respond as JSON: { feature_name, overall_score, verdict, summary, scores: [{ dimension, score, detail }] }`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1500,
    }),

    // 2. Find relevant podcast experts via vector similarity search (RAG)
    findRelevantExperts(featureDescription, 3).catch(() => [] as PodcastExpertContext[]),
  ]);

  // Parse scoring result
  let scoreText = scoreResponse.choices[0]?.message?.content || "{}";
  scoreText = scoreText.trim();
  if (scoreText.startsWith("```")) {
    scoreText = scoreText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }

  let scoreData: {
    feature_name: string;
    overall_score: number;
    verdict: string;
    summary: string;
    scores: ScoreItem[];
  };

  try {
    const raw = JSON.parse(scoreText);
    // Validate & clamp LLM output (scores in range, verdict is allowed, etc.)
    scoreData = validateReportOutput(raw);
  } catch {
    scoreData = {
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
    };
  }

  // Generate reactions from REAL podcast experts
  let reactions: ReactionItem[] = [];

  if (podcastExperts.length > 0) {
    reactions = await generateReactionsFromPodcast(
      podcastExperts,
      featureDescription,
      company,
      scoreData.verdict
    );
  }

  return {
    feature_name: scoreData.feature_name,
    overall_score: scoreData.overall_score,
    verdict: scoreData.verdict,
    summary: scoreData.summary,
    scores: scoreData.scores || [],
    reactions,
  };
}

/**
 * Generate expert reactions grounded in REAL podcast guest data.
 */
async function generateReactionsFromPodcast(
  experts: PodcastExpertContext[],
  featureDescription: string,
  company: { company_name: string; description: string; size: string; industry: string },
  verdict: string
): Promise<ReactionItem[]> {
  const expertContextBlocks = experts.map((e, i) => {
    const g = e.guest;
    const quotes = (g.notable_quotes || []).slice(0, 3).map((q) => `  - "${q}"`).join("\n");
    const opinions = (g.key_opinions || []).slice(0, 3).map((o) => `  - ${o}`).join("\n");
    const chunks = e.relevantChunks.map((c) => `  "${c.slice(0, 300)}..."`).join("\n");

    return `EXPERT ${i + 1}:
- Name: ${g.guest_name}
- Role: ${g.guest_role || "Product Leader"}
- Company: ${g.guest_company || "Unknown"}
- Episode: "${g.episode_title}"
- Speaking style: ${g.speaking_style || "Direct and analytical"}
- Key opinions:
${opinions || "  (none available)"}
- Notable quotes:
${quotes || "  (none available)"}
- Relevant transcript excerpts:
${chunks || "  (none available)"}`;
  }).join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You generate expert reactions for a feature validation report. Respond only with valid JSON.

CRITICAL RULES:
- You are given REAL podcast guests from the Product Builder Podcast. Use their EXACT names, roles, and companies.
- DO NOT change or invent names, roles, or companies. Use them EXACTLY as provided.
- Write each reaction in the guest's speaking style, drawing from their real opinions and quotes.
- Each reaction should feel like something this specific person would actually say, based on their known positions.
- Reactions must be about the specific feature being evaluated — not generic advice.
- Vary stances: one should be "supportive", one "cautious", one "critical" (adjust based on the feature verdict).`,
      },
      {
        role: "user",
        content: `Generate expert reactions for this feature idea from REAL Product Builder Podcast guests.

<feature_context>
FEATURE: ${featureDescription}
COMPANY: ${company.company_name} (${company.description}, ${company.size}, ${company.industry})
VERDICT: ${verdict}
</feature_context>

${expertContextBlocks}

For each expert above, write a 1-2 sentence reaction to this feature idea in their voice/style.
Use their EXACT name, role, and company. Draw on their known opinions and speaking style.
Vary stances across experts: "supportive", "cautious", "critical".

Respond as JSON: { reactions: [{ name, role, company, reaction, stance }] }`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 800,
  });

  let text = response.choices[0]?.message?.content || "{}";
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(text);
    return parsed.reactions || [];
  } catch {
    return [];
  }
}
