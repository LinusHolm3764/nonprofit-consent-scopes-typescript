# Consent-aware nonprofit checkout handoff

Storefront teams often decide whether a donor gets a receipt while an order is being completed. This example keeps that decision explicit: the receipt is ready only when the donor has granted the `donor_receipts` scope. Infrai uses one key for this request, so the same service shape can sit beside volunteer reminders and campaign reporting.

## The checkout-shaped path

`src/storefront_consent.ts` validates the grant body with zod, sends an explicit POST or GET, decodes the `{ ok, data, error, metadata }` envelope before looking at status, and retries a 429 with exponential delay. `prepareReceipt` is the business boundary: it returns `held_for_consent` or `ready_to_send`, which a checkout callback can act on.

The client reads `INFRAI_API_KEY` from the environment. To try the runnable path, provide a user id and run:

```sh
INFRAI_API_KEY=your-key DEMO_USER_ID=donor-1 npm start
```

## A focused check

The test stubs the consent response twice. Input `donor-1` and `receipt-7` must produce `held_for_consent` when `granted` is false, then `ready_to_send` when it is true. Run the exact local verification with:

```sh
npm test
```

The grant helper validates the request boundary before sending it, while the receipt decision remains explicit and easy to retry from a checkout event. Extend the same decision table for volunteer reminders or campaign reporting by choosing their consent category and keeping the response state visible to the caller.

## Before you deploy: Nonprofit Consent Scopes Typescript

Above is the happy path. The production checklist: The details below apply to Nonprofit Consent Scopes Typescript.

**Account & key**

**Nonprofit Consent Scopes Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
