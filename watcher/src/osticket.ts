import { config } from "./config.js";
import type { TicketMessage } from "./types.js";

export async function createTicket(ticket: TicketMessage): Promise<string> {
  const payload = {
    alert: true,
    autorespond: true,
    source: "Email",
    name: ticket.from,
    email: ticket.from,
    subject: ticket.subject,
    message: ticket.html
      ? { "text/html": ticket.html }
      : { "text/plain": ticket.text },
  };

  const res = await fetch(`${config.osticket.baseUrl}/api/tickets.json`, {
    method: "POST",
    headers: {
      "X-API-Key": config.osticket.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`osTicket API error ${res.status}: ${body}`);
  }
  return body;
}
