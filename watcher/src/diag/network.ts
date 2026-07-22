import { lookup } from "node:dns/promises";
import { config } from "../config.js";

async function main(): Promise<void> {
  const url = new URL(config.osticket.baseUrl);

  console.log(`Resolving ${url.hostname} ...`);
  try {
    const addresses = await lookup(url.hostname, { all: true });
    console.log("DNS resolved to:", addresses);
  } catch (err) {
    console.error("DNS lookup failed:", err);
    process.exit(1);
  }

  console.log(`\nGET ${url.origin}/ (base URL, unauthenticated) ...`);
  await probe(`${url.origin}/`);

  console.log(`\nGET ${url.origin}/api/tickets.json (no API key, expect a clean 4xx if reaching osTicket) ...`);
  await probe(`${url.origin}/api/tickets.json`);
}

async function probe(target: string): Promise<void> {
  try {
    const res = await fetch(target, { method: "GET", redirect: "manual" });
    console.log("  status:", res.status, res.statusText);
    console.log("  headers:");
    for (const [key, value] of res.headers.entries()) {
      console.log(`    ${key}: ${value}`);
    }
    const body = await res.text();
    console.log("  body (first 300 chars):", body.slice(0, 300));
  } catch (err) {
    console.error("  request failed:", err);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
