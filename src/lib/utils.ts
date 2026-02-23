import { customAlphabet } from "nanoid";

// URL-safe, non-ambiguous characters for slugs
const nanoid = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 10);

export function generateSlug(): string {
  return nanoid();
}

export function extractDomain(email: string): string {
  return email.split("@")[1] || "";
}
