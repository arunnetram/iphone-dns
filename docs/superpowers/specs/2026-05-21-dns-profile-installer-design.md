# DNS Profile Installer — Design

**Date:** 2026-05-21
**Status:** Draft, awaiting review

## What this is

A mobile-first web app that lets an iPhone user install an encrypted-DNS (DNS-over-HTTPS) configuration profile in one short flow. It is the practical equivalent of Cloudflare's 1.1.1.1 app for the specific job of "switch my phone to a different encrypted DNS resolver", without any native iOS code, App Store, or Apple Developer enrollment.

The site offers a small curated set of resolvers (Cloudflare, Cloudflare for Families, Quad9, AdGuard, Google) plus a bring-your-own DoH URL form. The user picks a resolver and an IP family (IPv4, IPv6, or both), the server generates a signed `.mobileconfig`, Safari hands it to the iOS profile installer, and a verification page confirms the new resolver is active.

Profiles are signed with a self-signed CA, which means each user installs a root certificate first (and enables it in iOS Certificate Trust Settings). This is a deliberate tradeoff — it avoids paid signing certs at the cost of a two-step install, and the UI is built around making that flow clear rather than hiding it.

## Non-goals

- Native iOS app. No NetworkExtension, no Swift, no App Store.
- Plain (unencrypted) DNS profiles, DNS-over-TLS, or DNS-over-QUIC. DoH only.
- Per-user accounts, settings persistence, history. All state is in URL query params.
- Production-grade trust UX. The self-signed CA flow is intentionally explicit; users who want a one-tap install should use one of the existing signed installers (Cloudflare's, AdGuard's, etc.).

## Architecture

Next.js 16 App Router on Vercel (Fluid Compute), TypeScript, Tailwind, shadcn/ui. No database — profiles are pure functions of their query-string inputs.

Three Route Handlers:

- `GET /api/root-ca` — returns the unsigned trust profile that installs the self-signed CA. Generated once per Function instance from `CA_CERT_PEM`, edge-cached forever.
- `GET /api/profile?resolver=...&family=...&url=...&ips=...` — assembles a DNS settings plist, wraps it in a CMS detached signature using the CA key, returns it with `Content-Type: application/x-apple-aspen-config`. Curated combinations are edge-cached forever; bring-your-own goes uncached.
- `GET /api/probe?expected=...` — verification helper; fetches per-resolver trace endpoints (e.g. `https://1.1.1.1/cdn-cgi/trace`) and reports whether the user's request appears to be routed through the expected resolver.

Three pages:

- `/` — resolver picker (curated cards + Custom tab) + IP family toggle + two-step install flow
- `/test` — post-install verification
- `/about` — what this is, why two installs, how iOS trust works, links to existing first-party installers

One-time bootstrap script `scripts/generate-ca.ts` generates the self-signed CA (RSA-4096, SHA-256, 10-year validity) and prints `CA_CERT_PEM` and `CA_KEY_PEM` values to paste into Vercel env vars. The script is local-only and the generated key never enters git.

### File layout

```
/
├── app/
│   ├── layout.tsx                  shell, mobile viewport meta
│   ├── page.tsx                    main installer flow
│   ├── test/page.tsx               post-install verification
│   ├── about/page.tsx              explainer
│   └── api/
│       ├── root-ca/route.ts        serves the CA trust profile
│       ├── profile/route.ts        generates + signs DNS profiles
│       └── probe/route.ts          verification helper
├── components/
│   ├── ResolverPicker.tsx          cards for the curated set
│   ├── FamilyToggle.tsx            IPv4 / IPv6 / Both segmented control
│   ├── CustomResolverForm.tsx      DoH URL + optional addresses
│   ├── InstallSteps.tsx            numbered step indicator
│   └── TestResult.tsx              verification result card
├── lib/
│   ├── resolvers.ts                curated resolver registry
│   ├── plist.ts                    builds DNSSettings + profile plist
│   ├── sign.ts                     CMS/PKCS#7 signing via node-forge
│   ├── ca.ts                       loads + caches CA cert+key from env
│   └── probe.ts                    per-resolver trace configs
├── scripts/
│   └── generate-ca.ts              local CA bootstrap
├── public/
├── vercel.ts                       cache headers for /api/profile, /api/root-ca
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Key dependencies

- `plist` — Apple plist builder (the `.mobileconfig` format is a signed plist)
- `node-forge` — pure-JS X.509 and PKCS#7/CMS signing
- `uuid` — `PayloadUUID` / `PayloadIdentifier` values
- `zod` — query-param validation
- `shadcn/ui` primitives (Button, Card, RadioGroup, Input, Tabs)

### Resolver registry shape

```ts
type Resolver = {
  key: string;                    // "cloudflare", "quad9", ...
  name: string;                   // display name
  description: string;
  doh: { url: string };           // ServerURL
  addresses: { v4: string[]; v6: string[] };
  probe?: { traceUrl: string; expectedMarker: string };
};
```

Adding a new curated resolver is one entry in `lib/resolvers.ts` plus a snapshot-test fixture per IP family.

## Data flow

### Curated install (e.g. Cloudflare + IPv4)

1. iPhone Safari opens `/?resolver=cloudflare`. Page renders with two CTAs: Install root certificate, Install DNS profile. Step 2 is disabled with an explainer until the user checks an "I've installed and trusted the root CA" confirmation box.
2. User taps Step 1 → `GET /api/root-ca`. On cold start, the Function reads `CA_CERT_PEM` from env, builds a `com.apple.security.root` payload wrapping the cert, returns it with `Content-Type: application/x-apple-aspen-config` and `Cache-Control: public, max-age=31536000, immutable`. Subsequent requests hit the edge cache. Safari hands the response to the iOS profile installer.
3. UI walks the user through `Settings > General > VPN & Device Management > Install` and then `Settings > General > About > Certificate Trust Settings > [CA name] toggle on`. Each step has an illustration.
4. User returns to the page, ticks the confirmation, taps Step 2 → `GET /api/profile?resolver=cloudflare&family=v4`. Function:
   - Validates params with zod
   - Looks up `cloudflare` in `lib/resolvers.ts`, picks v4 addresses
   - `lib/plist.ts` builds the `DNSSettings` payload (`DNSProtocol: HTTPS`, `ServerURL: https://cloudflare-dns.com/dns-query`, `ServerAddresses: [1.1.1.1, 1.0.0.1]`) inside a `ConfigurationProfile` wrapper. `PayloadIdentifier` is stable per `(resolver, family)` tuple (e.g. `app.dnsinstaller.cloudflare.v4`). `PayloadUUID` is a UUIDv5 derived from a fixed project namespace + the canonicalized input set, so the same query string always produces the same UUID
   - `lib/sign.ts` wraps the plist in CMS SignedData (detached, SHA-256, RSA) using cert+key from `lib/ca.ts`'s module-scope cache
   - Returns the signed profile with the same Content-Type and edge cache headers
5. Safari hands it to the iOS installer. With the CA trusted, the install sheet shows a green "Verified by [CA common name]" badge.
6. UI auto-redirects to `/test?expected=cloudflare`. Client calls `/api/probe?expected=cloudflare`. The Function fetches `https://1.1.1.1/cdn-cgi/trace` from the user's request context, parses fields, returns `{ passed, details }`. `TestResult` renders green or red.

### Bring-your-own (custom DoH URL)

Same shape, but:
- The Custom tab on `/` collects a DoH URL and optional comma-separated `ServerAddresses`.
- `/api/profile?url=...&ips=...` has no `resolver` key. Response is not edge-cached (`Cache-Control: private, no-store`).
- `/test` shows a "Custom resolver — automatic verification not available" card with a link to dnsleaktest.com and a manual checklist.

### Invariants

- Every input that affects the bytes of a profile is in the URL.
- The same query string always produces byte-identical output (deterministic `PayloadUUID`, no clock-dependent fields).
- Curated combinations are edge-cacheable; bring-your-own is not.
- The CA private key only ever lives in Vercel env vars and the Function instance's memory. It is never logged, returned, or shipped to the client.

## Error handling

### `/api/profile`, `/api/root-ca`, `/api/probe`

| Failure | Response | UX |
|---|---|---|
| Invalid query params (bad resolver key, malformed DoH URL, bad IP) | 400 JSON `{ error, field }` | Form re-renders with inline field error; no download triggered |
| Unknown resolver key | 404 JSON | Unreachable from the curated UI; logged as bug |
| Missing/malformed `CA_CERT_PEM` or `CA_KEY_PEM` | 500 JSON `{ error: "server_misconfigured" }` | UI shows "Service temporarily unavailable"; `console.error` so Vercel logs flag it |
| Probe trace endpoint times out or returns garbage | 200 JSON `{ status: "unknown", reason }` | Verification page shows "Couldn't verify — try again or check manually" |
| Signing throws | 500 JSON `{ error: "signing_failed" }` | Effectively deploy-time only — if it works once on the instance, it works for the instance's life |

### Custom resolver input validation (zod)

- `url`: must be `https://` with a valid hostname; max 2048 chars.
- `ips`: each must parse as IPv4 or IPv6; max 8 entries.
- Reject `localhost`, `127.0.0.0/8`, `::1`, link-local, RFC1918 ranges, `0.0.0.0`. Prevents accidentally-unreachable profiles and stops the page being used to SSRF internal addresses via the probe route.

### iOS install ordering

- The install flow is strictly sequential. Step 2 is disabled until the user explicitly confirms Step 1 is complete.
- If the user skips Certificate Trust Settings, the profile install fails silently on iOS's side. `/test` detects this case (cert payload installed but not trusted ⇒ subsequent DNS profile install fails) and tells the user exactly what to enable.
- `PayloadIdentifier` is stable per `(resolver, family)` tuple, so reinstalls replace rather than stack.

### Out of scope

- User revokes trust on the CA after the fact — iOS handles the consequences.
- iOS version differences — we target iOS 14+ (where DoH/DoT profile support landed) and don't try to gracefully degrade below that.

## Testing strategy

The profile bytes have to be exactly right; iOS rejects malformed plists and bad signatures with no useful diagnostics, and a wrong profile pointing a user at the wrong resolver is a meaningful failure. Most testing effort goes into the generation pipeline.

### Unit tests (Vitest)

- `lib/resolvers.ts` — every curated resolver has a valid DoH URL, v4 and v6 address arrays, unique key. Table-driven; catches typos when adding resolvers.
- `lib/plist.ts` — snapshot tests against known-good `.mobileconfig` XML for each curated resolver × IP family. `PayloadUUID` is injected as a fixed value in tests.
- `lib/sign.ts` — given a fixed plist + a fixed test CA (committed test fixture, separate from production), produces a deterministic CMS signature. Verify signature against the test CA cert. Verify the embedded plist round-trips byte-for-byte.
- `/api/profile` zod validation — table of bad inputs (bad URLs, RFC1918 IPs, oversized inputs) → expect 400 with the right `field` in the response body.

### Integration tests (Vitest + Next test runtime)

- `GET /api/profile?resolver=cloudflare&family=v4` — assert `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`, parse as plist, validate signature against test CA, validate inner `DNSSettings` payload.
- `GET /api/profile?url=...&ips=...` — assert `Cache-Control: private, no-store` and that the inner payload matches inputs.
- `GET /api/root-ca` — assert unsigned plist containing the CA cert in a `com.apple.security.root` payload.

### Manual smoke test (`docs/smoke-test.md`)

Automated tests prove the bytes; only an iPhone proves iOS accepts the bytes. Before each release:

1. Install root CA → enable in Certificate Trust Settings → install Cloudflare v4 profile. Confirm green "Verified" badge.
2. Visit `/test` — confirm Cloudflare detection passes.
3. Visit `https://1.1.1.1/help` — confirm DoH active.
4. Install a custom-resolver profile (e.g. NextDNS) — confirm install + `/test` fallback message.
5. Uninstall everything; confirm clean state.

### Explicitly not tested automatically

- iOS install behavior — no headless way; manual smoke test covers it.
- Cross-resolver probe accuracy — depends on third-party trace endpoints we don't control. Parsing logic is tested with fixtures; live calls are not.

## Open questions for implementation

None blocking. A few small decisions can be made during implementation:

- Exact visual identity (color, type, illustration style). Will be picked when wiring up the frontend with shadcn primitives.
- Whether to ship a privacy-policy / terms page. Likely yes for completeness; trivial to add later.
- Probe trace endpoints for Quad9 / AdGuard / Google — exact URLs and parsing logic will be confirmed when implementing `lib/probe.ts`.
