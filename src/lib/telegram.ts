const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a Telegram message when a new lead is collected.
 * Fire-and-forget — never blocks the lead API response.
 */
export async function notifyNewLead(lead: {
  name: string | null;
  email: string;
  domain: string | null;
  companyName: string | null;
  featureName: string | null;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping notification");
    return;
  }

  // Use HTML parse mode — much more forgiving than MarkdownV2
  const lines = [
    `🚀 <b>New Lead — Product Builder</b>`,
    ``,
    `<b>Name:</b> ${esc(lead.name || "—")}`,
    `<b>Email:</b> ${esc(lead.email)}`,
    lead.domain ? `<b>Domain:</b> ${esc(lead.domain)}` : null,
    lead.companyName ? `<b>Company:</b> ${esc(lead.companyName)}` : null,
    lead.featureName ? `<b>Feature:</b> ${esc(lead.featureName)}` : null,
  ].filter((line): line is string => line !== null).join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: lines,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Telegram] sendMessage failed:", res.status, errBody);
    }
  } catch (err) {
    console.error("[Telegram] fetch error:", err);
  }
}

/** Escape special characters for Telegram HTML mode */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
