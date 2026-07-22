import { config } from "./config.js";

const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.accountId}/queues/${config.cloudflare.queueId}/messages`;

const authHeaders = {
  Authorization: `Bearer ${config.cloudflare.apiToken}`,
  "Content-Type": "application/json",
};

export type PulledMessage<T> =
  | { leaseId: string; id: string; attempts: number; body: T; parseError?: undefined }
  | { leaseId: string; id: string; attempts: number; body?: undefined; parseError: string };

interface PullApiMessage {
  id: string;
  lease_id: string;
  attempts: number;
  body: string;
}

interface PullApiResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: {
    messages: PullApiMessage[];
  };
}

interface AckApiResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
}

export async function pullMessages<T>(): Promise<PulledMessage<T>[]> {
  const res = await fetch(`${API_BASE}/pull`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      batch_size: config.batchSize,
      visibility_timeout_ms: config.visibilityTimeoutMs,
    }),
  });

  const data = (await res.json()) as PullApiResponse;
  if (!res.ok || !data.success) {
    throw new Error(`Queue pull failed: ${JSON.stringify(data.errors ?? res.statusText)}`);
  }

  return data.result.messages.map((m): PulledMessage<T> => {
    try {
      return { leaseId: m.lease_id, id: m.id, attempts: m.attempts, body: JSON.parse(m.body) as T };
    } catch (err) {
      return {
        leaseId: m.lease_id,
        id: m.id,
        attempts: m.attempts,
        parseError: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

export async function ackMessages(leaseIds: string[]): Promise<void> {
  if (leaseIds.length === 0) return;
  await sendAck({ acks: leaseIds.map((leaseId) => ({ lease_id: leaseId })) });
}

export async function retryMessages(leaseIds: string[], delaySeconds = 60): Promise<void> {
  if (leaseIds.length === 0) return;
  await sendAck({
    retries: leaseIds.map((leaseId) => ({ lease_id: leaseId, delay_seconds: delaySeconds })),
  });
}

async function sendAck(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_BASE}/ack`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AckApiResponse;
  if (!res.ok || !data.success) {
    throw new Error(`Queue ack failed: ${JSON.stringify(data.errors ?? res.statusText)}`);
  }
}
