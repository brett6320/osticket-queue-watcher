import { submitEmail } from "../osticket.js";
import { config } from "../config.js";

function buildDummyEmail(): string {
  const messageId = `<diag-${Date.now()}@osticket-queue-watcher>`;
  const lines = [
    "From: Diag Script <diag@example.com>",
    "To: diag@example.com",
    "Subject: [diag] osTicket API connectivity test",
    `Message-ID: ${messageId}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Created by watcher's diag script to verify API access from inside the container. Safe to close/delete.",
  ];
  return lines.join("\r\n");
}

async function main(): Promise<void> {
  console.log(`Submitting dummy email via ${config.osticket.baseUrl}/api/tickets.email ...`);

  const rawEmailBase64 = Buffer.from(buildDummyEmail(), "utf-8").toString("base64");
  const result = await submitEmail({ rawEmailBase64, receivedAt: new Date().toISOString() });

  console.log(`OK: submitted (response: ${result})`);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  console.error("Check OSTICKET_URL, OSTICKET_API_KEY, and the key's IP allow-list.");
  process.exit(1);
});
