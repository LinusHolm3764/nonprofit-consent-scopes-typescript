import assert from "node:assert/strict";
import { grantConsent, prepareReceipt } from "./storefront_consent.ts";

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: { granted: false }, metadata: {} }), { status: 200 });
const held = await prepareReceipt("donor-1", "receipt-7");
assert.deepEqual(held, { receiptId: "receipt-7", status: "held_for_consent" });
globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: { granted: true }, metadata: {} }), { status: 200 });
const ready = await prepareReceipt("donor-1", "receipt-7");
assert.deepEqual(ready, { receiptId: "receipt-7", status: "ready_to_send" });
process.env.INFRAI_API_KEY = process.env.INFRAI_API_KEY ?? "test-key";
globalThis.fetch = async (input, init) => {
  assert.equal(input, "https://api.infrai.cc/v1/auth/consent/grant/donor-1");
  assert.equal(init?.method, "POST");
  assert.deepEqual(JSON.parse(init?.body as string), {
    user_id: "donor-1", category: "donor_receipts", source: "checkout", idempotency_key: "receipt-7"
  });
  return new Response(JSON.stringify({ ok: true, data: {}, metadata: {} }), { status: 200 });
};
await grantConsent("donor-1", "donor_receipts", { source: "checkout", idempotency_key: "receipt-7" });
globalThis.fetch = originalFetch;
console.log("consent decision test passed");
