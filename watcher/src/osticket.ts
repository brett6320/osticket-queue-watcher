import { config } from "./config.js";
import type { TicketMessage } from "./types.js";

function toDataUri(mimeType: string, content: string): string {
  return `data:${mimeType};base64,${Buffer.from(content, "utf-8").toString("base64")}`;
}

function recipientsHeader(ticket: TicketMessage): string {
  const lines = [`To: ${ticket.to}`];
  if (ticket.cc) lines.push(`Cc: ${ticket.cc}`);
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function createTicket(ticket: TicketMessage): Promise<string> {
  const payload = {
    alert: true,
    autorespond: true,
    source: "API",
    name: ticket.fromName || ticket.from,
    email: ticket.from,
    subject: ticket.subject,
    message: ticket.html
      ? toDataUri("text/html", `<pre>${escapeHtml(recipientsHeader(ticket))}</pre><hr>${ticket.html}`)
      : toDataUri("text/plain", `${recipientsHeader(ticket)}\n\n${ticket.text}`),
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
