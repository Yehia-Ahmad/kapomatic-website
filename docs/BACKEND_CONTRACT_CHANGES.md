# Required Backend Contract Changes

No backend code was modified. This document records frontend-visible risks and the desired migration contract.

## Critical: browser-supplied product price

Both Postman collections show `/api/cart/checkout` accepting `products[].price`. If the server trusts it, a visitor can alter an order price. The rebuild can reduce accidental staleness but cannot solve backend price authority.

Desired order request:

```json
{
  "customerName": "string",
  "customerPhone": "string",
  "government": "string",
  "shippingLocation": "string",
  "paymentMethod": "cash | wallet | instapay",
  "transferPhone": "conditional string",
  "transferImageToken": "conditional upload token",
  "products": [{ "productId": "string", "quantity": 1 }],
  "bundles": [{ "bundleId": "string", "quantity": 1 }],
  "idempotencyKey": "uuid"
}
```

The backend must calculate authoritative unit price, discounts, availability, stock, subtotal, shipping, free-shipping eligibility and payable total in one transaction or reservation flow.

## Required quote and conflict behavior

Add `POST /api/public/cart/quote` accepting IDs and quantities only. Return a quote ID/version, expiry, normalized line prices, unavailable/changed/deleted lines, subtotal, shipping options, threshold, discounts and total. Checkout should accept the quote ID plus an idempotency key.

Use structured conflicts:

- `409 PRICE_CHANGED`
- `409 OUT_OF_STOCK`
- `409 PRODUCT_REMOVED`
- `409 QUOTE_EXPIRED`
- `409 DUPLICATE_IDEMPOTENCY_KEY` only when payload differs

Repeat submission with the same key and identical payload must return the original result.

## Payment proof

Replace unbounded base64-in-JSON with a separate authenticated-by-upload-token public upload flow:

1. `POST /api/public/payment-proofs` multipart upload.
2. Enforce MIME sniffing, allowlisted PNG/JPEG/WebP, byte limit, dimensions and malware/storage policy.
3. Return a short-lived opaque token, not a public storage path.
4. Checkout references the token.
5. Define retention, reviewer access, deletion and incident policy.

Until this exists, the frontend compatibility adapter must enforce an approved size/type limit, avoid persistence/logging, clear the data after submission, and label the residual backend risk.

## Standard errors and correlation

Recommended response envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "non-sensitive developer summary",
    "fields": { "customerPhone": ["INVALID_FORMAT"] },
    "correlationId": "opaque-id"
  }
}
```

Return a request correlation ID in a response header and payload. Never require the storefront to show internal exception text.

## Contract divergence to resolve

- The localized/SEO backend collection contains slug, localized catalog and sitemap endpoints but not Home Page Builder/header/bundles.
- The newer ecommerce backend collection contains Home Page Builder/header/bundles but not the localized SEO folder.
- General settings and header settings can both supply logo/color-like presentation data. Decide precedence: recommended global theme from general settings, header-specific logo/appearance from public header with explicit fallback.
- Dynamic Home supports a `locale` query, but the inspected legacy adapter hardcodes `ar`; the rebuild requires real `ar|en` responses.

## Frontend migration switches

1. Centralize current checkout payload creation in one adapter.
2. Gate legacy `price` inclusion behind a typed compatibility capability.
3. Add quote/idempotency interfaces now, initially backed by an explicit “unsupported” capability.
4. Contract-test both legacy and secure payload modes.
5. Remove `price` and base64 proof only after deployed capability confirmation, not by version guessing.
