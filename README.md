# iphone-dns

> One-tap iPhone DNS-over-HTTPS profile installer. Self-signed CA, no app needed.

A mobile-first Next.js site that hands an iPhone user a signed `.mobileconfig` profile to switch their device to an encrypted-DNS resolver of their choice — Cloudflare, Quad9, AdGuard, or any custom DoH endpoint. Built on Vercel Functions, no database, no analytics, no user accounts.

Live at **https://iphone-dns.vercel.app**.

## The pitch (for non-technical readers)

Every time you tap an app, your phone has to ask "what's the actual address for this place?" Names like `instagram.com` are friendly labels; the internet runs on numbers. By default your phone asks that question **out loud, on a postcard, with no envelope** — every WiFi router along the way reads it. So does your carrier. So does the hotel WiFi.

This site fixes that. One install, no app icon, no subscription, no VPN draining the battery. Every "what's the address?" question your phone makes now goes inside a sealed envelope to a resolver *you* picked.

Longer version in [`docs/pitch.md`](docs/pitch.md).

## How it works

It's a two-step trust handshake the first time you use it:

1. **Install the root certificate** the site delivers, and enable it in Settings → General → About → Certificate Trust Settings. One-time setup per device.
2. **Install the DNS profile** for the resolver you want. Signed by the CA from step 1, so iOS shows a green "Verified" badge.

After step 1, you can install as many DNS profiles as you like — switching between Cloudflare, Quad9, AdGuard etc. is just a fresh profile install with no re-trust needed.

The deeper "why two installs?", "what about that 'Not Signed' warning?", and "what is the verify page actually checking?" answers live in [`docs/FAQ.md`](docs/FAQ.md).

## Tech stack

- **Next.js 16** (App Router) on **Vercel Fluid Compute**
- **TypeScript**, **Tailwind CSS**, shadcn-style UI primitives (Radix under the hood)
- **`node-forge`** for X.509 certs and CMS/PKCS#7 signing
- **`plist`** for Apple property-list construction
- **`zod`** for query-param validation
- **Vitest** for unit + integration tests (27 across 8 files)

No database. All state is in URL query params; profiles are deterministic functions of their inputs.

## Local development

```bash
# 1. Install
pnpm install

# 2. Generate a CA for local use
pnpm generate-ca > /tmp/ca.txt
# Convert the JSON-quoted output into .env.local — see docs/smoke-test.md
# or just paste both CA_CERT_PEM and CA_KEY_PEM values into a .env.local file.

# 3. Run the dev server
pnpm dev

# 4. Run tests
pnpm test
pnpm typecheck
```

The test suite includes deterministic snapshot tests for the generated `.mobileconfig` files; if you change `lib/plist.ts`, you'll need to delete the snapshot in `tests/fixtures/snapshots/` and let it regenerate.

## Deploying your own

1. `pnpm generate-ca` locally, get the printed `CA_CERT_PEM` and `CA_KEY_PEM` values.
2. Paste both into your Vercel project's environment variables for **all three** environments (Production, Preview, Development). Make sure to paste the raw multi-line PEM, not the JSON-escaped form — see `docs/FAQ.md` for the gotcha that bit me.
3. `vercel --prod` (or push to the linked Git branch — see `vercel.ts`).
4. Run the manual smoke test in [`docs/smoke-test.md`](docs/smoke-test.md) against the deployed URL with an actual iPhone — that's the only thing automated tests can't cover.

## Project structure

```
app/                  Next.js pages and API routes
  page.tsx              installer
  test/page.tsx         verification
  about/page.tsx        explainer
  api/
    root-ca/route.ts    serves the unsigned CA trust profile
    profile/route.ts    generates + signs DNS profiles
    probe/route.ts      verification helper
components/           UI components
  ui/                   shadcn-style primitives
lib/                  Pure library code (all unit-tested)
  ca.ts                 load + cache CA cert/key from env
  resolvers.ts          curated resolver registry
  plist.ts              build DNSSettings + profile plists
  sign.ts               CMS/PKCS#7 signing
  probe.ts              per-resolver verification helper
scripts/
  generate-ca.ts        local CA bootstrap (prints env-var values)
tests/                Vitest suite (27 tests)
docs/                 Specs, plans, FAQ, pitch, smoke-test checklist
```

## Documentation

- [`docs/FAQ.md`](docs/FAQ.md) — trust model questions, why two installs, what `/test` actually checks
- [`docs/pitch.md`](docs/pitch.md) — the "Postcard Problem" explainer for non-technical readers
- [`docs/smoke-test.md`](docs/smoke-test.md) — manual iOS verification checklist for each release
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — design spec
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — implementation plan

## Status

- All 20 implementation tasks from the plan are complete (commit history shows the timeline).
- Tests: 27/27 passing on every push (see CI badge above once it runs).
- Manual smoke test: passes on iPhone 13+ / iOS 17+. iPhone 7 / iOS 15.8 has a known input-selection issue currently being investigated.
- CA bootstrap is self-signed; for fully-signed installs without the root-cert trust step, see Cloudflare's `one.one.one.one`.
