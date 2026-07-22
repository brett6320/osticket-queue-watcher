import { config } from "./config.js";
import { pullMessages, ackMessages, retryMessages } from "./cloudflareQueue.js";
import { submitEmail } from "./osticket.js";
import type { QueuedEmail } from "./types.js";

let stopping = false;

async function pollOnce(): Promise<void> {
  const messages = await pullMessages<QueuedEmail>();
  if (messages.length === 0) return;

  console.log(`Pulled ${messages.length} message(s)`);

  const acks: string[] = [];
  const retries: string[] = [];

  for (const msg of messages) {
    if (msg.parseError !== undefined) {
      console.error(`Failed to parse message ${msg.id}, will retry: ${msg.parseError}`);
      retries.push(msg.leaseId);
      continue;
    }

    try {
      const result = await submitEmail(msg.body);
      acks.push(msg.leaseId);
      console.log(`Submitted message ${msg.id} to osTicket (response: ${result})`);
    } catch (err) {
      console.error(`Failed to submit message ${msg.id} to osTicket:`, err);
      retries.push(msg.leaseId);
    }
  }

  const results = await Promise.allSettled([ackMessages(acks), retryMessages(retries)]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to ack/retry pulled messages (they'll requeue via visibility timeout):", result.reason);
    }
  }
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
