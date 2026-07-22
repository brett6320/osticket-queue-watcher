import PostalMime from "postal-mime";

export interface Env {
  TICKET_QUEUE: Queue<TicketMessage>;
}

export interface TicketMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string | undefined;
  messageId: string | undefined;
  receivedAt: string;
}

export default {
  async email(message, env, ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);

    const ticket: TicketMessage = {
      from: message.from,
      to: message.to,
      subject: parsed.subject || "(no subject)",
      text: parsed.text || parsed.html || "(empty message)",
      html: parsed.html,
      messageId: parsed.messageId,
      receivedAt: new Date().toISOString(),
    };

    await env.TICKET_QUEUE.send(ticket);
  },
} satisfies ExportedHandler<Env>;
