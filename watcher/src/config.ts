function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  cloudflare: {
    accountId: requireEnv("CF_ACCOUNT_ID"),
    apiToken: requireEnv("CF_API_TOKEN"),
    queueId: requireEnv("CF_QUEUE_ID"),
  },
  osticket: {
    baseUrl: requireEnv("OSTICKET_URL").replace(/\/+$/, ""),
    apiKey: requireEnv("OSTICKET_API_KEY"),
  },
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
  batchSize: Number(process.env.BATCH_SIZE ?? 25),
  visibilityTimeoutMs: Number(process.env.VISIBILITY_TIMEOUT_MS ?? 30000),
};
