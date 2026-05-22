# FAQ

## Setup

### What does `pnpm generate-ca` actually create?

Two related secrets that, together, form your project's own tiny certificate authority (CA):

- **`CA_CERT_PEM`** — a self-signed X.509 root certificate. This is the *public* half. Every iPhone user has to install this on their device once and toggle "trust" so iOS will accept profiles signed by it.
- **`CA_KEY_PEM`** — the RSA private key that pairs with the cert. This is the *private* half. The Vercel function uses it on every request to `/api/profile` to sign the DNS profile it sends back.

The pair never expires from anything but time (10-year validity by default). You generate them once, paste them into Vercel, and forget about them — unless they leak, in which case you regenerate, re-deploy, and every user who'd previously trusted the old CA needs to install the new one.

### Why are the CA cert and key stored as Vercel environment variables?

Because the signing key is a **secret that the running code needs to access at runtime, but that absolutely cannot live in git**.

If the key leaked:
- Anyone could sign `.mobileconfig` profiles claiming to be from "DNS Installer CA"
- Every iPhone that previously trusted the CA would silently accept those forged profiles
- An attacker could push a DNS profile that routes traffic through their own resolver — including for domains like your bank — without iOS warning the user

Storing it in code, committing it to git, or hard-coding it into the Docker image would all leak it. Vercel environment variables:
- Are encrypted at rest
- Are only decrypted and injected into the Function process at startup
- Are not visible in logs, builds, or anywhere the source code lives

The cert (the public half) is technically not secret — it's the same cert every user installs on their phone. But it's stored as an env var alongside the key for symmetry and because the loader (`lib/ca.ts`) expects both in the same place.

---

## Trust model

### Why two downloads (root cert + DNS profile)?

iOS only displays the green "Verified" badge on a `.mobileconfig` if the file is signed by a certificate that iOS already trusts. Two ways to earn that trust:

| Approach | What it takes | What the user sees |
|---|---|---|
| **Buy a signing cert** from a CA Apple already trusts (DigiCert, Sectigo, etc — ~$50–$300/yr, or $99/yr Apple Developer with a code-signing cert) | Money + paperwork | One install, green "Verified" |
| **Use a self-signed CA** and have the user install it as trusted first | Free | Two installs (the CA, then the DNS profile) |

This project picks the second path to avoid the recurring fee. The cryptography is identical — the difference is purely about who Apple has already decided to trust. Cloudflare's `one.one.one.one`, AdGuard, NextDNS etc. all use path #1 because they have budgets for it.

### Do I have to re-install the root cert when switching resolvers?

**No.** Install the root cert **once**, ever, on each device. After that, every DNS profile you install gets the green "Verified" badge automatically — because they're all signed by the same root CA that's now permanently trusted.

Each curated option has a stable `PayloadIdentifier`:
- Reinstalling the *same* one (e.g. `cloudflare.v4`) overwrites the previous copy
- Installing a *different* one (e.g. `quad9.both`) sits alongside the old one in Settings, with the most recently installed one being active

Switching between Cloudflare, Quad9, AdGuard, etc. is just a new DNS profile install — no root cert work needed.

### Why does the root certificate download show "Signed by: Not Signed"?

This is correct and expected. It's the same warning any self-signed CA install in iOS shows — including the ones used internally by enterprise MDM, AdGuard's setup, and Cloudflare's enterprise WARP.

The reason is a chicken-and-egg problem:
- iOS will only show "Signed" if the signature comes from a CA it already trusts
- The CA you're trying to install... is the CA you're trying to make trusted
- You can't sign a "trust me" profile with the cert you're asking it to trust — iOS doesn't trust it *yet*

So the root cert profile is delivered unsigned, and iOS warns "Not Signed" on this one screen. **It is the only step in the entire flow that uses an unsigned profile.** The cert itself is human-inspectable in Settings before you enable trust.

Once trust is enabled, every subsequent DNS profile **is** signed by that CA and **does** show as "Verified by DNS Installer CA" in green.

---

## Verification page

### What is `/test` actually checking?

`/test` calls the Vercel function `/api/probe`, which calls the chosen resolver's trace endpoint (e.g. `https://1.1.1.1/cdn-cgi/trace` for Cloudflare). It checks that:

- The resolver's edge is reachable
- The response contains the expected marker (e.g. `warp=` in Cloudflare's case)

What `/test` is **not** doing: confirming that *your iPhone* is resolving DNS through the chosen resolver. Because the probe runs on the Vercel function (in a data center, not on your phone), the trace it reads back reflects the function's view of the world, not your device's.

For an authoritative end-to-end check, visit https://1.1.1.1/help in Safari on the phone — Cloudflare's own check page runs JavaScript that talks to a Cloudflare-only endpoint via DNS and reports whether your device is actually using their resolver.

---

## Quick pitch for peers

> "It's a two-step trust handshake. First I tell my phone 'trust this little CA' — one time, free. After that, every DNS resolver I install is verified by that CA and gets a green badge. The first step looks scary because iOS shows 'Not Signed,' but that's the same warning you'd see installing a corporate Wi-Fi profile or an enterprise MDM. The alternative is paying ~$100/yr for a publicly trusted code-signing cert just to skip one warning screen."
