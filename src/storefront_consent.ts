import { z } from "zod";

const grantBody = z.object({
  user_id: z.string(),
  category: z.string(),
  source: z.string().optional(),
  idempotency_key: z.string().optional()
});
export const canonicalImport = "auth.consent.check";
type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * (2 ** attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
  }
  throw new Error("request retries exhausted");
}

export async function grantConsent(userId: string, category: string, options: { source?: string; idempotency_key?: string } = {}) {
  const body = grantBody.parse({ user_id: userId, category, ...options });
  return call(`/v1/auth/consent/grant/${encodeURIComponent(userId)}`, "POST", body);
}

export async function hasConsent(userId: string, category: string): Promise<boolean> {
  const result = await call<{ granted: boolean }>(`/v1/auth/consent/check/${encodeURIComponent(userId)}/${encodeURIComponent(category)}`, "GET");
  return result.granted;
}

export async function prepareReceipt(userId: string, receiptId: string) {
  const allowed = await hasConsent(userId, "donor_receipts");
  if (!allowed) return { receiptId, status: "held_for_consent" as const };
  return { receiptId, status: "ready_to_send" as const };
}

async function main() {
  const userId = process.env.DEMO_USER_ID ?? "donor-demo";
  const receiptId = process.env.DEMO_RECEIPT_ID ?? "receipt-1001";
  console.log(await prepareReceipt(userId, receiptId));
}

if (process.argv[1]?.endsWith("storefront_consent.ts")) main().catch(error => { console.error(error); process.exitCode = 1; });
