import OpenAI from "openai";
import { neon } from "@neondatabase/serverless";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Reuse a single module-level SQL connection (not per-request)
const sql = neon(process.env.DATABASE_URL!);

interface GuestProfile {
  guest_name: string;
  guest_role: string | null;
  guest_company: string | null;
  expertise_areas: string[] | null;
  key_opinions: string[] | null;
  notable_quotes: string[] | null;
  speaking_style: string | null;
  episode_title: string;
}

interface RelevantChunk {
  guest_name: string;
  guest_role: string | null;
  guest_company: string | null;
  chunk_text: string;
  similarity: number;
}

export interface PodcastExpertContext {
  guest: GuestProfile;
  relevantChunks: string[];
}

/**
 * Generate an embedding vector for a text using OpenAI's text-embedding-ada-002
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text.slice(0, 8000), // Limit input size
  });
  return response.data[0].embedding;
}

/**
 * Find the most relevant podcast experts for a given feature description.
 * Uses vector similarity search on podcast transcript chunks, then fetches
 * matching guest profiles with their quotes and opinions.
 *
 * Returns up to `limit` unique experts with their relevant transcript excerpts.
 */
export async function findRelevantExperts(
  featureDescription: string,
  limit: number = 3
): Promise<PodcastExpertContext[]> {

  // Step 1: Generate embedding for the feature description
  const embedding = await generateEmbedding(featureDescription);
  const embeddingStr = `[${embedding.join(",")}]`;

  // Step 2: Find top relevant chunks via cosine similarity
  // Get more than we need so we can pick diverse guests
  const chunks = await sql`
    SELECT
      guest_name,
      guest_role,
      guest_company,
      chunk_text,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM podcast_chunks
    WHERE embedding IS NOT NULL
      AND guest_name != 'Unknown'
      AND guest_company != 'Unknown'
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT 30
  `;

  // Step 3: Pick top unique guests (up to `limit`)
  const seenGuests = new Set<string>();
  const guestChunksMap = new Map<string, string[]>();

  for (const chunk of chunks as RelevantChunk[]) {
    const key = chunk.guest_name;
    if (!seenGuests.has(key) && seenGuests.size < limit) {
      seenGuests.add(key);
      guestChunksMap.set(key, [chunk.chunk_text]);
    } else if (seenGuests.has(key)) {
      // Add additional relevant chunks for this guest (up to 2)
      const existing = guestChunksMap.get(key) || [];
      if (existing.length < 2) {
        existing.push(chunk.chunk_text);
        guestChunksMap.set(key, existing);
      }
    }
  }

  if (seenGuests.size === 0) {
    return [];
  }

  const guestNames = Array.from(seenGuests);

  // Step 4: Fetch full guest profiles
  const profiles = await sql`
    SELECT
      guest_name,
      guest_role,
      guest_company,
      expertise_areas,
      key_opinions,
      notable_quotes,
      speaking_style,
      episode_title
    FROM guest_profiles
    WHERE guest_name = ANY(${guestNames})
  `;

  // Step 5: Combine profiles with relevant chunks
  const results: PodcastExpertContext[] = [];

  for (const name of guestNames) {
    const profile = (profiles as GuestProfile[]).find((p) => p.guest_name === name);
    if (!profile) continue;

    // Skip guests with insufficient data
    if (
      (!profile.guest_role || profile.guest_role === "Unknown") &&
      (!profile.guest_company || profile.guest_company === "Unknown")
    ) {
      continue;
    }

    results.push({
      guest: profile,
      relevantChunks: guestChunksMap.get(name) || [],
    });
  }

  return results.slice(0, limit);
}
