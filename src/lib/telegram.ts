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

  const lines = [
    `🚀 *New Lead — Product Builder*`,
    ``,
    `*Name:* ${esc(lead.name || "—")}`,
    `*Email:* ${esc(lead.email)}`,
    lead.domain ? `*Domain:* ${esc(lead.domain)}` : null,
    lead.companyName ? `*Company:* ${esc(lead.companyName)}` : null,
    lead.featureName ? `*Feature:* ${esc(lead.featureName)}` : null,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: lines,
        parse_mode: "MarkdownV2",
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

/** Escape special characters for Telegram MarkdownV2 */
function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
