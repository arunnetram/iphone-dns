# Contributing

Thanks for considering a contribution. This is a small personal project — keeping it that way is part of the appeal — but PRs and issues are welcome.

## Before opening a PR

1. **Open an issue first for non-trivial changes.** Bug fixes can go straight to PR; new features, behavior changes, or design decisions are easier to align on as an issue first. Avoids both of us being disappointed when a multi-day PR misses the spirit of the project.
2. **Branch protection on `master` is on.** Pushes go through PRs with a passing `build` check (`pnpm typecheck` + `pnpm test`). The PR title should follow the conventional-commits style already in the log (`feat(scope):`, `fix(scope):`, `chore:`, `docs:`, `ci:`).

## Local setup

```bash
git clone https://github.com/arunnetram/iphone-dns.git
cd iphone-dns
pnpm install

# generate a throwaway CA for local dev
pnpm generate-ca
# follow the printed instructions to put CA_CERT_PEM and CA_KEY_PEM
# into .env.local (real multi-line PEMs, not JSON-escaped — see docs/FAQ.md
# for the gotcha that bit the original author)

pnpm dev          # http://localhost:3000
pnpm test         # 27 tests across 8 files, ~1s
pnpm typecheck
```

## How the codebase is structured

A short tour for someone new — fuller details are in `README.md`.

- `lib/` is pure code (no React, no Next). Every file there has Vitest tests. If you're adding a resolver, a new probe, or anything plist-shaped, this is where it lives.
- `app/api/*/route.ts` are the three Vercel Functions. They're thin — they wire `lib/` to HTTP. Validators (zod) and cache headers are inline; signing happens via `lib/sign.ts`.
- `app/` and `components/` are the UI. Mobile-first Tailwind, shadcn-style primitives in `components/ui/`.
- `tests/` mirrors the source tree. `tests/fixtures/snapshots/` holds golden `.mobileconfig` XML — if you change `lib/plist.ts` intentionally, delete the snapshot and let it regenerate.
- `scripts/generate-ca.ts` is run once per environment, not part of the runtime.

## Conventions

- **TDD where it pays.** New `lib/` modules get unit tests first. UI components don't (the manual smoke test in `docs/smoke-test.md` is the real check).
- **YAGNI.** Don't add abstraction for a hypothetical future case. Three repeated lines is better than a premature helper.
- **Avoid silent failures.** If something fails, surface the actual error in the response or logs. The route handlers currently swallow real errors and return `{error: "server_misconfigured"}` to clients — that's intentional for the user-facing path, but log the underlying error with `console.error`.
- **No comments restating what the code does.** Only the *why* — the surprising constraint, the workaround for a specific iOS quirk, the deferred decision. The codebase has examples.

## Running the manual smoke test

Some things only show up on an actual phone. `docs/smoke-test.md` is the checklist that catches what the unit tests can't (iOS profile-install ordering, trust toggle UX, the "Not Signed" warning, etc.). If your change touches the install flow, run it before requesting review.

## Security issues

Please don't file these as public issues. See [`SECURITY.md`](SECURITY.md) for private reporting channels.
