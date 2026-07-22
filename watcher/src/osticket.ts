import { config } from "./config.js";
import type { QueuedEmail } from "./types.js";

/**
 * Posts the raw email to osTicket's email-piping endpoint (not the JSON
 * tickets.json endpoint). osTicket parses the MIME message itself and
 * matches it against existing tickets via Message-ID/In-Reply-To/References
 * headers, only creating a new ticket if nothing matches — the JSON API
 * only supports creating brand new tickets, with no threading.
 */
export async function submitEmail(email: QueuedEmail): Promise<string> {
  const raw = Buffer.from(email.rawEmailBase64, "base64");

  const res = await fetch(`${config.osticket.baseUrl}/api/tickets.email`, {
    method: "POST",
    headers: {
      "X-API-Key": config.osticket.apiKey,
      "Content-Type": "message/rfc822",
    },
    body: raw,
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`osTicket API error ${res.status}: ${body}`);
  }
  return body;
}
