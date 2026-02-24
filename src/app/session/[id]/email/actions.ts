"use server";

import { signIn } from "@/lib/auth";

export async function signInWithGoogle(callbackUrl: string) {
  // Security: prevent open redirect — only allow relative paths
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    callbackUrl = "/";
  }
  await signIn("google", { redirectTo: callbackUrl });
}
