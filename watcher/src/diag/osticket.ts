import { createTicket } from "../osticket.js";
import { config } from "../config.js";

async function main(): Promise<void> {
  console.log(`Creating dummy ticket via ${config.osticket.baseUrl}/api/tickets.json ...`);

  const ticketNumber = await createTicket({
    from: "diag@example.com",
    to: "diag@example.com",
    subject: "[diag] osTicket API connectivity test",
    text: "Created by watcher's diag script to verify API access from inside the container. Safe to close/delete.",
    html: undefined,
    messageId: undefined,
    receivedAt: new Date().toISOString(),
  });

  console.log(`OK: ticket created (response: ${ticketNumber})`);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  console.error("Check OSTICKET_URL, OSTICKET_API_KEY, and the key's IP allow-list.");
  process.exit(1);
});
