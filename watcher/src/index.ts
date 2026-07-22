import { config } from "./config.js";
import { pullMessages, ackMessages, retryMessages } from "./cloudflareQueue.js";
import { createTicket } from "./osticket.js";
import type { TicketMessage } from "./types.js";

let stopping = false;

async function pollOnce(): Promise<void> {
  const messages = await pullMessages<TicketMessage>();
  if (messages.length === 0) return;

  console.log(`Pulled ${messages.length} message(s)`);

  const acks: string[] = [];
  const retries: string[] = [];

  for (const msg of messages) {
    try {
      await createTicket(msg.body);
      acks.push(msg.leaseId);
      console.log(`Ticket created for message ${msg.id} (${msg.body.subject})`);
    } catch (err) {
      console.error(`Failed to create ticket for message ${msg.id}:`, err);
      retries.push(msg.leaseId);
    }
  }

  await ackMessages(acks);
  await retryMessages(retries);
}

async function main(): Promise<void> {
  console.log("osticket-queue-watcher starting", {
    queueId: config.cloudflare.queueId,
    osTicketUrl: config.osticket.baseUrl,
    pollIntervalMs: config.pollIntervalMs,
  });

  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));

  while (!stopping) {
    try {
      await pollOnce();
    } catch (err) {
      console.error("Poll error:", err);
    }
    await sleep(config.pollIntervalMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
