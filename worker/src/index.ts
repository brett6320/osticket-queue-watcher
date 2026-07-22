export interface Env {
  TICKET_QUEUE: Queue<QueuedEmail>;
}

export interface QueuedEmail {
  rawEmailBase64: string;
  receivedAt: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // avoid call-stack limits from spreading huge arrays
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default {
  async email(message, env, ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();

    const queuedEmail: QueuedEmail = {
      // osTicket's /api/tickets.email endpoint parses the raw MIME message
      // itself (headers, threading, attachments), so we just forward the
      // bytes rather than parsing anything here.
      rawEmailBase64: arrayBufferToBase64(raw),
      receivedAt: new Date().toISOString(),
    };

    await env.TICKET_QUEUE.send(queuedEmail);
  },
} satisfies ExportedHandler<Env>;
