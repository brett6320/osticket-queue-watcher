import PostalMime, { type Address } from "postal-mime";

export interface Env {
  TICKET_QUEUE: Queue<TicketMessage>;
}

export interface TicketMessage {
  from: string;
  fromName: string | undefined;
  to: string;
  cc: string | undefined;
  subject: string;
  text: string;
  html: string | undefined;
  messageId: string | undefined;
  receivedAt: string;
}

function formatAddressList(addresses: Address[] | undefined): string | undefined {
  if (!addresses || addresses.length === 0) return undefined;
  return addresses
    .flatMap((a) => (a.group ? a.group : [a]))
    .map((a) => (a.name ? `${a.name} <${a.address}>` : (a.address ?? "")))
    .filter(Boolean)
    .join(", ");
}

export default {
  async email(message, env, ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);

    // message.from/message.to are the SMTP envelope addresses, which
    // upstream mail flow rules (e.g. an M365 redirect) commonly rewrite
    // (SRS bounce address, single envelope recipient) for SPF compliance
    // and delivery routing. The parsed From/To/Cc headers survive a
    // redirect intact and reflect the actual original message.
    const from = parsed.from?.address || message.from;
    const fromName = parsed.from?.name || undefined;
    const to = formatAddressList(parsed.to) || message.to;
    const cc = formatAddressList(parsed.cc);

    const ticket: TicketMessage = {
      from,
      fromName,
      to,
      cc,
      subject: parsed.subject || "(no subject)",
      text: parsed.text || parsed.html || "(empty message)",
      html: parsed.html,
      messageId: parsed.messageId,
      receivedAt: new Date().toISOString(),
    };

    await env.TICKET_QUEUE.send(ticket);
  },
} satisfies ExportedHandler<Env>;
