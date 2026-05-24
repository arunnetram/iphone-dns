# Security policy

## Supported versions

Only the latest production deployment on the `master` branch (currently served at https://iphone-dns.vercel.app) is supported. There are no point releases — fixes land in `master` and are deployed.

## Reporting a vulnerability

**Please do not open public GitHub issues for security problems.** Use one of these private channels:

- **Preferred:** GitHub's [private security advisory](https://github.com/arunnetram/iphone-dns/security/advisories/new) form.
- **Alternative:** Email arun.netram@gmail.com with `[iphone-dns security]` in the subject.

When you report, please include:

- A description of the issue
- Steps to reproduce, ideally against the deployed instance or a local checkout
- The impact you believe it has
- Any suggested mitigation, if you have one

I'll acknowledge receipt within a few days. This is a personal project, not a funded program — there's no bug bounty, but credit will be given in the fix commit and any subsequent release notes unless you'd rather stay anonymous.

## What's in scope

Real issues worth reporting:

- **CA private-key exposure paths.** Anything that could leak `CA_KEY_PEM` from the Vercel function — e.g. via an unintended response body, logs, or error message.
- **Profile signature forgery.** Anything that lets an attacker get the deployed function to sign a `.mobileconfig` it shouldn't (with attacker-controlled `ServerURL`, `ServerAddresses`, etc.).
- **SSRF via `/api/probe` or `/api/profile`.** The validators in `app/api/profile/route.ts` reject loopback / RFC1918 / link-local addresses; bypasses are in scope.
- **Plist injection** through query params that ends up shaping the generated `.mobileconfig` in unintended ways.
- **Auth-related vulnerabilities** — there's no auth in this app, but if you find a way to alter the production CA via the deployed instance, that's serious.

## What's out of scope

- The "Not Signed" warning on the root CA install profile. That is intentional and documented in [`docs/FAQ.md`](docs/FAQ.md) — it's a property of self-signed CA installs on iOS, not a vulnerability.
- Reports that the `/test` page's server-side probe doesn't verify the user's device DNS path. Also documented; the page links to the resolver's own device-side check for authoritative verification.
- Findings against forks or self-hosted instances using their own CA — only the deployed instance and the upstream code on `master` are in scope.
- Automated scanner output without a working proof of concept.

## Threat model

This project signs `.mobileconfig` profiles with a self-signed root CA whose key lives in Vercel environment variables. If that key leaks, anyone who has trusted the CA on their iPhone is vulnerable to forged profiles installing attacker-controlled DNS settings — see [`docs/FAQ.md`](docs/FAQ.md) for the rationale on why this tradeoff exists. Protecting the key is the primary security goal.
