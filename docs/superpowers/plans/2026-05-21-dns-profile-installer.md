# DNS Profile Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Next.js web app on Vercel that delivers signed `.mobileconfig` DNS-over-HTTPS profiles to iPhone users, with a curated resolver set, bring-your-own DoH support, and a post-install verification page.

**Architecture:** Next.js 16 App Router. Three Route Handlers (`/api/root-ca`, `/api/profile`, `/api/probe`) generate signed plists on the fly using a self-signed CA loaded from env vars. UI is three pages (`/`, `/test`, `/about`). No database — state is URL query params. Curated profiles are edge-cached; bring-your-own goes uncached.

**Tech Stack:** Next.js 16, TypeScript, Tailwind, shadcn/ui, `plist`, `node-forge`, `uuid`, `zod`, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-05-21-dns-profile-installer-design.md`

---

## File Structure

```
app/
  layout.tsx              # mobile shell, fonts
  page.tsx                # installer
  test/page.tsx           # verification
  about/page.tsx          # explainer
  globals.css
  api/
    root-ca/route.ts
    profile/route.ts
    probe/route.ts
components/
  ResolverPicker.tsx
  FamilyToggle.tsx
  CustomResolverForm.tsx
  InstallSteps.tsx
  TestResult.tsx
  ui/                     # shadcn primitives
lib/
  resolvers.ts            # curated registry
  plist.ts                # build profile plists
  sign.ts                 # CMS signing
  ca.ts                   # load + cache CA from env
  probe.ts                # per-resolver probe configs
scripts/
  generate-ca.ts          # local CA bootstrap
tests/
  fixtures/
    test-ca.pem
    test-ca.key
    snapshots/            # known-good .mobileconfig XML
  lib/
    plist.test.ts
    sign.test.ts
    ca.test.ts
    resolvers.test.ts
  api/
    profile.test.ts
    root-ca.test.ts
    probe.test.ts
docs/
  smoke-test.md
vercel.ts
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
postcss.config.mjs
vitest.config.ts
```

---

## Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "dns-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate-ca": "tsx scripts/generate-ca.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "node-forge": "^1.3.1",
    "plist": "^3.1.0",
    "uuid": "^11.0.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/node-forge": "^1.3.11",
    "@types/plist": "^3.0.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 4: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.mjs**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 6: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { height: 100%; }
body { @apply bg-neutral-50 text-neutral-900 antialiased; }
```

- [ ] **Step 7: Create app/layout.tsx**

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Encrypted DNS for iPhone',
  description: 'Install a DNS-over-HTTPS profile on your iPhone in one tap.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create placeholder app/page.tsx**

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">DNS Installer</h1>
      <p className="mt-2 text-neutral-600">Coming together.</p>
    </main>
  );
}
```

- [ ] **Step 9: Install dependencies**

Run: `pnpm install` (or `npm install`)
Expected: dependencies resolve, lockfile created.

- [ ] **Step 10: Verify dev server boots**

Run: `pnpm dev` then `curl -s http://localhost:3000 | grep "DNS Installer"`
Expected: matches "DNS Installer". Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs app/ .gitignore
git commit -m "chore: scaffold Next.js + Tailwind project"
```

---

## Task 2: Vitest config + smoke test

**Files:**
- Create: `vitest.config.ts`, `tests/smoke.test.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/
git commit -m "chore: add vitest with smoke test"
```

---

## Task 3: CA bootstrap script + test CA fixture

**Files:**
- Create: `scripts/generate-ca.ts`, `tests/fixtures/test-ca.pem`, `tests/fixtures/test-ca.key`

- [ ] **Step 1: Write scripts/generate-ca.ts**

```ts
import forge from 'node-forge';
import fs from 'node:fs';
import path from 'node:path';

type Mode = 'env' | 'fixture';

function generateCA(commonName: string) {
  const keys = forge.pki.rsa.generateKeyPair(4096);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(15));
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: 'DNS Installer' },
    { name: 'countryName', value: 'US' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

const mode: Mode = (process.argv[2] as Mode) ?? 'env';

if (mode === 'fixture') {
  const { certPem, keyPem } = generateCA('DNS Installer Test CA');
  const dir = path.resolve('tests/fixtures');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'test-ca.pem'), certPem);
  fs.writeFileSync(path.join(dir, 'test-ca.key'), keyPem);
  console.log('Wrote test CA fixture to tests/fixtures/');
} else {
  const { certPem, keyPem } = generateCA('DNS Installer CA');
  console.log('# Paste into Vercel env vars or .env.local');
  console.log('CA_CERT_PEM=' + JSON.stringify(certPem));
  console.log('CA_KEY_PEM=' + JSON.stringify(keyPem));
}
```

- [ ] **Step 2: Generate the test CA fixture**

Run: `pnpm tsx scripts/generate-ca.ts fixture`
Expected: writes `tests/fixtures/test-ca.pem` and `tests/fixtures/test-ca.key`.

- [ ] **Step 3: Sanity-check the fixture**

Run: `openssl x509 -in tests/fixtures/test-ca.pem -noout -subject -issuer`
Expected: subject and issuer both `CN = DNS Installer Test CA`.

- [ ] **Step 4: Commit**

The test CA is committed as a fixture — it's only used in tests. The production CA is generated locally by the user and pasted into Vercel env vars; it is never committed.

```bash
git add scripts/ tests/fixtures/
git commit -m "feat: CA bootstrap script + test fixture"
```

---

## Task 4: lib/ca.ts — load + cache CA from env

**Files:**
- Create: `lib/ca.ts`, `tests/lib/ca.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/ca.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const certPem = fs.readFileSync(path.resolve('tests/fixtures/test-ca.pem'), 'utf8');
const keyPem = fs.readFileSync(path.resolve('tests/fixtures/test-ca.key'), 'utf8');

describe('lib/ca', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env.CA_CERT_PEM = certPem;
    process.env.CA_KEY_PEM = keyPem;
    // Reset module-scope cache between tests
    const { __resetCAForTesting } = await import('@/lib/ca');
    __resetCAForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns parsed cert and key', async () => {
    const { getCA } = await import('@/lib/ca');
    const ca = getCA();
    expect(ca.cert.subject.getField('CN').value).toBe('DNS Installer Test CA');
    expect(ca.key).toBeDefined();
  });

  it('caches across calls', async () => {
    const { getCA } = await import('@/lib/ca');
    expect(getCA()).toBe(getCA());
  });

  it('throws on missing env vars', async () => {
    delete process.env.CA_CERT_PEM;
    const { getCA, __resetCAForTesting } = await import('@/lib/ca');
    __resetCAForTesting();
    expect(() => getCA()).toThrow(/CA_CERT_PEM/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/lib/ca.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write lib/ca.ts**

```ts
import forge from 'node-forge';

type CA = {
  cert: forge.pki.Certificate;
  key: forge.pki.rsa.PrivateKey;
};

let cached: CA | null = null;

export function getCA(): CA {
  if (cached) return cached;
  const certPem = process.env.CA_CERT_PEM;
  const keyPem = process.env.CA_KEY_PEM;
  if (!certPem) throw new Error('CA_CERT_PEM env var is required');
  if (!keyPem) throw new Error('CA_KEY_PEM env var is required');
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const key = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey;
    cached = { cert, key };
    return cached;
  } catch (err) {
    throw new Error('Failed to parse CA cert/key: ' + (err as Error).message);
  }
}

export function __resetCAForTesting(): void {
  cached = null;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm test tests/lib/ca.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/ca.ts tests/lib/ca.test.ts
git commit -m "feat(lib): load and cache CA cert/key from env"
```

---

## Task 5: lib/resolvers.ts — curated registry

**Files:**
- Create: `lib/resolvers.ts`, `tests/lib/resolvers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/resolvers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RESOLVERS, getResolver } from '@/lib/resolvers';

describe('lib/resolvers', () => {
  it('has the five curated resolvers', () => {
    expect(Object.keys(RESOLVERS).sort()).toEqual(
      ['adguard', 'cloudflare', 'cloudflare-families', 'google', 'quad9']
    );
  });

  it('every resolver has valid DoH URL and at least one v4 + v6 address', () => {
    for (const [key, r] of Object.entries(RESOLVERS)) {
      expect(r.doh.url.startsWith('https://')).toBe(true);
      expect(r.addresses.v4.length).toBeGreaterThan(0);
      expect(r.addresses.v6.length).toBeGreaterThan(0);
      expect(r.key).toBe(key);
    }
  });

  it('getResolver returns the resolver by key', () => {
    expect(getResolver('cloudflare')?.name).toBe('Cloudflare');
  });

  it('getResolver returns null for unknown key', () => {
    expect(getResolver('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/lib/resolvers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write lib/resolvers.ts**

```ts
export type Resolver = {
  key: string;
  name: string;
  description: string;
  doh: { url: string };
  addresses: { v4: string[]; v6: string[] };
  probe?: { traceUrl: string; expectedMarker: string };
};

export const RESOLVERS: Record<string, Resolver> = {
  cloudflare: {
    key: 'cloudflare',
    name: 'Cloudflare',
    description: 'Fast, privacy-respecting DNS from Cloudflare (1.1.1.1).',
    doh: { url: 'https://cloudflare-dns.com/dns-query' },
    addresses: {
      v4: ['1.1.1.1', '1.0.0.1'],
      v6: ['2606:4700:4700::1111', '2606:4700:4700::1001'],
    },
    probe: { traceUrl: 'https://1.1.1.1/cdn-cgi/trace', expectedMarker: 'warp=' },
  },
  'cloudflare-families': {
    key: 'cloudflare-families',
    name: 'Cloudflare for Families',
    description: 'Blocks malware and adult content (1.1.1.3).',
    doh: { url: 'https://family.cloudflare-dns.com/dns-query' },
    addresses: {
      v4: ['1.1.1.3', '1.0.0.3'],
      v6: ['2606:4700:4700::1113', '2606:4700:4700::1003'],
    },
    probe: { traceUrl: 'https://1.1.1.3/cdn-cgi/trace', expectedMarker: 'warp=' },
  },
  quad9: {
    key: 'quad9',
    name: 'Quad9',
    description: 'Blocks malicious domains using threat intelligence (9.9.9.9).',
    doh: { url: 'https://dns.quad9.net/dns-query' },
    addresses: {
      v4: ['9.9.9.9', '149.112.112.112'],
      v6: ['2620:fe::fe', '2620:fe::9'],
    },
    probe: { traceUrl: 'https://on.quad9.net/', expectedMarker: 'Quad9' },
  },
  adguard: {
    key: 'adguard',
    name: 'AdGuard DNS',
    description: 'Blocks ads and trackers system-wide.',
    doh: { url: 'https://dns.adguard-dns.com/dns-query' },
    addresses: {
      v4: ['94.140.14.14', '94.140.15.15'],
      v6: ['2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff'],
    },
    probe: { traceUrl: 'https://dns.adguard-dns.com/check.html', expectedMarker: 'AdGuard' },
  },
  google: {
    key: 'google',
    name: 'Google',
    description: 'Google Public DNS (8.8.8.8).',
    doh: { url: 'https://dns.google/dns-query' },
    addresses: {
      v4: ['8.8.8.8', '8.8.4.4'],
      v6: ['2001:4860:4860::8888', '2001:4860:4860::8844'],
    },
  },
};

export function getResolver(key: string): Resolver | null {
  return RESOLVERS[key] ?? null;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm test tests/lib/resolvers.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/resolvers.ts tests/lib/resolvers.test.ts
git commit -m "feat(lib): curated resolver registry"
```

---

## Task 6: lib/plist.ts — build profile plists

**Files:**
- Create: `lib/plist.ts`, `tests/lib/plist.test.ts`, `tests/fixtures/snapshots/cloudflare-v4.mobileconfig`

The Apple `.mobileconfig` is a property list with a `ConfigurationProfile` outer payload and a `com.apple.dnsSettings.managed` inner payload. We build it from a typed input.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/plist.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildDnsProfilePlist, buildRootCAPlist } from '@/lib/plist';

describe('lib/plist', () => {
  it('builds a deterministic DNS profile plist for Cloudflare v4', () => {
    const xml = buildDnsProfilePlist({
      displayName: 'DNS: Cloudflare (IPv4)',
      payloadIdentifier: 'app.dnsinstaller.cloudflare.v4',
      dohUrl: 'https://cloudflare-dns.com/dns-query',
      serverAddresses: ['1.1.1.1', '1.0.0.1'],
      cacheKey: 'cloudflare:v4',
    });
    const snapshotPath = path.resolve('tests/fixtures/snapshots/cloudflare-v4.mobileconfig');
    if (!fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, xml);
    }
    const expected = fs.readFileSync(snapshotPath, 'utf8');
    expect(xml).toBe(expected);
  });

  it('produces same UUIDs across calls (deterministic)', () => {
    const a = buildDnsProfilePlist({
      displayName: 'x',
      payloadIdentifier: 'app.dnsinstaller.test',
      dohUrl: 'https://example.com/dns-query',
      serverAddresses: ['9.9.9.9'],
      cacheKey: 'test',
    });
    const b = buildDnsProfilePlist({
      displayName: 'x',
      payloadIdentifier: 'app.dnsinstaller.test',
      dohUrl: 'https://example.com/dns-query',
      serverAddresses: ['9.9.9.9'],
      cacheKey: 'test',
    });
    expect(a).toBe(b);
  });

  it('different cacheKey produces different UUIDs', () => {
    const a = buildDnsProfilePlist({
      displayName: 'x',
      payloadIdentifier: 'app.dnsinstaller.a',
      dohUrl: 'https://example.com/dns-query',
      serverAddresses: ['9.9.9.9'],
      cacheKey: 'a',
    });
    const b = buildDnsProfilePlist({
      displayName: 'x',
      payloadIdentifier: 'app.dnsinstaller.b',
      dohUrl: 'https://example.com/dns-query',
      serverAddresses: ['9.9.9.9'],
      cacheKey: 'b',
    });
    expect(a).not.toBe(b);
  });

  it('buildRootCAPlist wraps a PEM cert in a Root payload', () => {
    const certPem = fs.readFileSync(path.resolve('tests/fixtures/test-ca.pem'), 'utf8');
    const xml = buildRootCAPlist(certPem);
    expect(xml).toContain('com.apple.security.root');
    expect(xml).toContain('PayloadContent');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/lib/plist.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write lib/plist.ts**

```ts
import plist from 'plist';
import { v5 as uuidv5 } from 'uuid';
import forge from 'node-forge';

// Fixed namespace UUID for this app — never change after first deploy.
const NAMESPACE = '6f7c3b1e-9b2a-4d3e-8f5a-1c2d3e4f5a6b';

function deterministicUUID(key: string): string {
  return uuidv5(key, NAMESPACE).toUpperCase();
}

export type DnsProfileInput = {
  displayName: string;
  payloadIdentifier: string;   // e.g. "app.dnsinstaller.cloudflare.v4"
  dohUrl: string;
  serverAddresses: string[];
  cacheKey: string;            // used to derive UUIDs deterministically
};

export function buildDnsProfilePlist(input: DnsProfileInput): string {
  const outerUUID = deterministicUUID(input.cacheKey + ':outer');
  const innerUUID = deterministicUUID(input.cacheKey + ':inner');

  const profile = {
    PayloadType: 'Configuration',
    PayloadVersion: 1,
    PayloadIdentifier: input.payloadIdentifier,
    PayloadUUID: outerUUID,
    PayloadDisplayName: input.displayName,
    PayloadDescription: 'Configures encrypted DNS (DNS-over-HTTPS) on this device.',
    PayloadContent: [
      {
        PayloadType: 'com.apple.dnsSettings.managed',
        PayloadVersion: 1,
        PayloadIdentifier: input.payloadIdentifier + '.settings',
        PayloadUUID: innerUUID,
        PayloadDisplayName: input.displayName,
        DNSSettings: {
          DNSProtocol: 'HTTPS',
          ServerURL: input.dohUrl,
          ServerAddresses: input.serverAddresses,
        },
      },
    ],
  };

  return plist.build(profile);
}

export function buildRootCAPlist(certPem: string): string {
  // Strip PEM headers, decode to DER bytes
  const cert = forge.pki.certificateFromPem(certPem);
  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const derBuffer = Buffer.from(derBytes, 'binary');

  const cn = cert.subject.getField('CN')?.value ?? 'DNS Installer CA';

  const profile = {
    PayloadType: 'Configuration',
    PayloadVersion: 1,
    PayloadIdentifier: 'app.dnsinstaller.root-ca',
    PayloadUUID: deterministicUUID('root-ca:outer'),
    PayloadDisplayName: `${cn} (Trust Certificate)`,
    PayloadDescription: 'Installs the DNS Installer root certificate so DNS profiles can be verified.',
    PayloadContent: [
      {
        PayloadType: 'com.apple.security.root',
        PayloadVersion: 1,
        PayloadIdentifier: 'app.dnsinstaller.root-ca.cert',
        PayloadUUID: deterministicUUID('root-ca:inner'),
        PayloadDisplayName: cn,
        PayloadCertificateFileName: 'ca.cer',
        PayloadContent: derBuffer,
      },
    ],
  };

  return plist.build(profile);
}
```

- [ ] **Step 4: Run, expect PASS (snapshot is created on first run)**

Run: `pnpm test tests/lib/plist.test.ts`
Expected: 4 passed. First run writes `tests/fixtures/snapshots/cloudflare-v4.mobileconfig`.

- [ ] **Step 5: Sanity-check the snapshot**

Run: `cat tests/fixtures/snapshots/cloudflare-v4.mobileconfig | head -30`
Expected: well-formed plist XML with `PayloadType` `Configuration`, inner `com.apple.dnsSettings.managed`, `ServerURL` `https://cloudflare-dns.com/dns-query`, `ServerAddresses` containing `1.1.1.1`.

- [ ] **Step 6: Commit**

```bash
git add lib/plist.ts tests/lib/plist.test.ts tests/fixtures/snapshots/
git commit -m "feat(lib): build DNS profile and root CA plists"
```

---

## Task 7: lib/sign.ts — CMS signing

**Files:**
- Create: `lib/sign.ts`, `tests/lib/sign.test.ts`

`.mobileconfig` signing uses CMS/PKCS#7 SignedData with the plist embedded (attached signature). Output is DER-encoded binary.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/sign.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';
import { signProfile } from '@/lib/sign';

const certPem = fs.readFileSync(path.resolve('tests/fixtures/test-ca.pem'), 'utf8');
const keyPem = fs.readFileSync(path.resolve('tests/fixtures/test-ca.key'), 'utf8');
const cert = forge.pki.certificateFromPem(certPem);
const key = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey;

describe('lib/sign', () => {
  it('produces a CMS SignedData blob containing the plist', () => {
    const plistXml = '<?xml version="1.0"?><plist><dict><key>k</key><string>v</string></dict></plist>';
    const signed = signProfile(plistXml, cert, key);

    expect(Buffer.isBuffer(signed)).toBe(true);
    expect(signed.length).toBeGreaterThan(plistXml.length);

    // Parse the CMS structure and verify it contains our content
    const asn1 = forge.asn1.fromDer(signed.toString('binary'));
    const p7 = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData;
    expect(p7.content).toBeDefined();
    const content = (p7.content as forge.util.ByteStringBuffer).bytes();
    expect(content).toBe(plistXml);
  });

  it('signed output verifies against the signing cert', () => {
    const plistXml = '<plist>test</plist>';
    const signed = signProfile(plistXml, cert, key);
    const asn1 = forge.asn1.fromDer(signed.toString('binary'));
    const p7 = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData;
    expect(p7.certificates.length).toBeGreaterThan(0);
    const signerCert = p7.certificates[0];
    expect(signerCert.subject.getField('CN').value).toBe('DNS Installer Test CA');
  });

  it('is deterministic for the same input (no random nonce)', () => {
    const plistXml = '<plist>test</plist>';
    const a = signProfile(plistXml, cert, key);
    const b = signProfile(plistXml, cert, key);
    // CMS signatures may include signing time; if they differ, only allow the time field to differ.
    // For our purposes, byte-identical is required for HTTP caching, so we assert equality.
    expect(a.equals(b)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/lib/sign.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write lib/sign.ts**

```ts
import forge from 'node-forge';

export function signProfile(
  plistXml: string,
  cert: forge.pki.Certificate,
  key: forge.pki.rsa.PrivateKey
): Buffer {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(plistXml, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    // Authenticated attributes intentionally omitted to keep the output
    // byte-identical across calls (no signingTime). iOS accepts this form.
  });
  p7.sign({ detached: false });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, 'binary');
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm test tests/lib/sign.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/sign.ts tests/lib/sign.test.ts
git commit -m "feat(lib): CMS sign profile plist with CA cert+key"
```

---

## Task 8: lib/probe.ts — per-resolver probe configs

**Files:**
- Create: `lib/probe.ts`

This is a thin module — the probe URLs already live in `RESOLVERS`. This file just exposes a typed helper for parsing trace responses. No tests here; behavior is tested as part of `app/api/probe/route.ts`.

- [ ] **Step 1: Write lib/probe.ts**

```ts
import { getResolver } from './resolvers';

export type ProbeResult =
  | { status: 'pass'; details: Record<string, string> }
  | { status: 'fail'; reason: string }
  | { status: 'unknown'; reason: string };

export async function probeResolver(resolverKey: string): Promise<ProbeResult> {
  const resolver = getResolver(resolverKey);
  if (!resolver) return { status: 'unknown', reason: 'unknown resolver key' };
  if (!resolver.probe) {
    return { status: 'unknown', reason: 'no probe configured for this resolver' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(resolver.probe.traceUrl, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      return { status: 'unknown', reason: `probe returned HTTP ${res.status}` };
    }
    const text = await res.text();
    if (!text.includes(resolver.probe.expectedMarker)) {
      return { status: 'fail', reason: 'expected marker not found in probe response' };
    }
    // Parse trace-style key=value lines into a details object (Cloudflare format).
    const details: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) details[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return { status: 'pass', details };
  } catch (err) {
    return { status: 'unknown', reason: (err as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/probe.ts
git commit -m "feat(lib): per-resolver probe helper"
```

---

## Task 9: `/api/root-ca` route handler

**Files:**
- Create: `app/api/root-ca/route.ts`, `tests/api/root-ca.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/root-ca.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

beforeAll(async () => {
  process.env.CA_CERT_PEM = fs.readFileSync(path.resolve('tests/fixtures/test-ca.pem'), 'utf8');
  process.env.CA_KEY_PEM = fs.readFileSync(path.resolve('tests/fixtures/test-ca.key'), 'utf8');
  const { __resetCAForTesting } = await import('@/lib/ca');
  __resetCAForTesting();
});

describe('GET /api/root-ca', () => {
  it('returns the root CA trust profile', async () => {
    const { GET } = await import('@/app/api/root-ca/route');
    const res = await GET();
    expect(res.headers.get('Content-Type')).toBe('application/x-apple-aspen-config');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    const body = await res.text();
    expect(body).toContain('com.apple.security.root');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/api/root-ca.test.ts`
Expected: FAIL — route handler not found.

- [ ] **Step 3: Write app/api/root-ca/route.ts**

```ts
import { NextResponse } from 'next/server';
import { getCA } from '@/lib/ca';
import { buildRootCAPlist } from '@/lib/plist';
import forge from 'node-forge';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const ca = getCA();
    const certPem = forge.pki.certificateToPem(ca.cert);
    const xml = buildRootCAPlist(certPem);
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': 'attachment; filename="dns-installer-root-ca.mobileconfig"',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('root-ca route failed:', err);
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm test tests/api/root-ca.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/root-ca/ tests/api/root-ca.test.ts
git commit -m "feat(api): /api/root-ca route handler"
```

---

## Task 10: `/api/profile` route handler

**Files:**
- Create: `app/api/profile/route.ts`, `tests/api/profile.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/profile.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';

beforeAll(async () => {
  process.env.CA_CERT_PEM = fs.readFileSync(path.resolve('tests/fixtures/test-ca.pem'), 'utf8');
  process.env.CA_KEY_PEM = fs.readFileSync(path.resolve('tests/fixtures/test-ca.key'), 'utf8');
  const { __resetCAForTesting } = await import('@/lib/ca');
  __resetCAForTesting();
});

async function call(url: string) {
  const { GET } = await import('@/app/api/profile/route');
  return GET(new Request(url));
}

describe('GET /api/profile', () => {
  it('returns a signed profile for a curated resolver', async () => {
    const res = await call('http://localhost/api/profile?resolver=cloudflare&family=v4');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/x-apple-aspen-config');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    const body = Buffer.from(await res.arrayBuffer());
    // Should be CMS DER, parse it
    const asn1 = forge.asn1.fromDer(body.toString('binary'));
    const p7 = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData;
    const inner = (p7.content as forge.util.ByteStringBuffer).bytes();
    expect(inner).toContain('cloudflare-dns.com');
    expect(inner).toContain('1.1.1.1');
  });

  it('supports family=v6', async () => {
    const res = await call('http://localhost/api/profile?resolver=cloudflare&family=v6');
    expect(res.status).toBe(200);
    const body = Buffer.from(await res.arrayBuffer());
    const inner = forge.pkcs7.messageFromAsn1(
      forge.asn1.fromDer(body.toString('binary'))
    ) as forge.pkcs7.PkcsSignedData;
    const content = (inner.content as forge.util.ByteStringBuffer).bytes();
    expect(content).toContain('2606:4700:4700::1111');
    expect(content).not.toContain('1.1.1.1');
  });

  it('supports family=both', async () => {
    const res = await call('http://localhost/api/profile?resolver=cloudflare&family=both');
    const body = Buffer.from(await res.arrayBuffer());
    const inner = forge.pkcs7.messageFromAsn1(
      forge.asn1.fromDer(body.toString('binary'))
    ) as forge.pkcs7.PkcsSignedData;
    const content = (inner.content as forge.util.ByteStringBuffer).bytes();
    expect(content).toContain('1.1.1.1');
    expect(content).toContain('2606:4700:4700::1111');
  });

  it('custom resolver: not edge-cacheable', async () => {
    const res = await call(
      'http://localhost/api/profile?url=' +
      encodeURIComponent('https://example.com/dns-query') +
      '&ips=' + encodeURIComponent('9.9.9.9,2620:fe::fe')
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('rejects unknown resolver', async () => {
    const res = await call('http://localhost/api/profile?resolver=nope&family=v4');
    expect(res.status).toBe(404);
  });

  it('rejects RFC1918 custom IP', async () => {
    const res = await call(
      'http://localhost/api/profile?url=' + encodeURIComponent('https://example.com/dns-query') + '&ips=192.168.1.1'
    );
    expect(res.status).toBe(400);
  });

  it('rejects non-https custom URL', async () => {
    const res = await call(
      'http://localhost/api/profile?url=' + encodeURIComponent('http://example.com/dns-query')
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/api/profile.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write app/api/profile/route.ts**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCA } from '@/lib/ca';
import { getResolver } from '@/lib/resolvers';
import { buildDnsProfilePlist } from '@/lib/plist';
import { signProfile } from '@/lib/sign';

const FamilySchema = z.enum(['v4', 'v6', 'both']);

const CuratedSchema = z.object({
  resolver: z.string().min(1),
  family: FamilySchema,
});

// IP validation: reject loopback, link-local, private ranges, 0.0.0.0.
function isAllowedIP(ip: string): boolean {
  // Crude but sufficient: reject obvious local/private ranges.
  if (ip === '0.0.0.0' || ip === '::1' || ip === '127.0.0.1') return false;
  if (ip.startsWith('127.')) return false;
  if (ip.startsWith('10.')) return false;
  if (ip.startsWith('192.168.')) return false;
  if (ip.startsWith('169.254.')) return false;
  if (ip.startsWith('fe80:') || ip.startsWith('fe80::')) return false;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return false;
  // 172.16.0.0/12
  const m = ip.match(/^172\.(\d+)\./);
  if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return false;
  return true;
}

const IPSchema = z.string().refine(isAllowedIP, { message: 'disallowed IP address' });

const CustomSchema = z.object({
  url: z.string().url().startsWith('https://').max(2048),
  ips: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []))
    .pipe(z.array(IPSchema).max(8)),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  // Curated path
  if (params.resolver) {
    const parsed = CuratedSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_input', field: parsed.error.issues[0]?.path[0], detail: parsed.error.message },
        { status: 400 }
      );
    }
    const resolver = getResolver(parsed.data.resolver);
    if (!resolver) {
      return NextResponse.json({ error: 'unknown_resolver' }, { status: 404 });
    }
    const addresses =
      parsed.data.family === 'v4'
        ? resolver.addresses.v4
        : parsed.data.family === 'v6'
          ? resolver.addresses.v6
          : [...resolver.addresses.v4, ...resolver.addresses.v6];

    return buildSignedResponse({
      displayName: `DNS: ${resolver.name} (${parsed.data.family.toUpperCase()})`,
      payloadIdentifier: `app.dnsinstaller.${resolver.key}.${parsed.data.family}`,
      dohUrl: resolver.doh.url,
      serverAddresses: addresses,
      cacheKey: `${resolver.key}:${parsed.data.family}`,
      cacheable: true,
    });
  }

  // Custom path
  if (params.url) {
    const parsed = CustomSchema.safeParse({ url: params.url, ips: params.ips });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_input', field: parsed.error.issues[0]?.path.join('.'), detail: parsed.error.message },
        { status: 400 }
      );
    }
    const hostname = new URL(parsed.data.url).hostname;
    return buildSignedResponse({
      displayName: `DNS: ${hostname}`,
      payloadIdentifier: `app.dnsinstaller.custom.${hashKey(parsed.data.url + '|' + parsed.data.ips.join(','))}`,
      dohUrl: parsed.data.url,
      serverAddresses: parsed.data.ips,
      cacheKey: 'custom:' + parsed.data.url + ':' + parsed.data.ips.join(','),
      cacheable: false,
    });
  }

  return NextResponse.json({ error: 'missing_params' }, { status: 400 });
}

function buildSignedResponse(input: {
  displayName: string;
  payloadIdentifier: string;
  dohUrl: string;
  serverAddresses: string[];
  cacheKey: string;
  cacheable: boolean;
}) {
  try {
    const ca = getCA();
    const plistXml = buildDnsProfilePlist(input);
    const signed = signProfile(plistXml, ca.cert, ca.key);
    return new NextResponse(signed, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': `attachment; filename="${input.payloadIdentifier}.mobileconfig"`,
        'Cache-Control': input.cacheable
          ? 'public, max-age=31536000, immutable'
          : 'private, no-store',
      },
    });
  } catch (err) {
    console.error('profile route failed:', err);
    return NextResponse.json({ error: 'signing_failed' }, { status: 500 });
  }
}

function hashKey(s: string): string {
  // Short, stable, URL-safe identifier suffix.
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm test tests/api/profile.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/profile/ tests/api/profile.test.ts
git commit -m "feat(api): /api/profile route with curated and custom paths"
```

---

## Task 11: `/api/probe` route handler

**Files:**
- Create: `app/api/probe/route.ts`, `tests/api/probe.test.ts`

The probe makes a real HTTP call. We mock fetch in tests.

- [ ] **Step 1: Write the failing test**

Create `tests/api/probe.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
});

async function call(url: string) {
  const { GET } = await import('@/app/api/probe/route');
  return GET(new Request(url));
}

describe('GET /api/probe', () => {
  it('reports pass when expected marker is in trace response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'fl=abc\nh=cloudflare\nwarp=off\n',
      status: 200,
    } as Response));

    const res = await call('http://localhost/api/probe?expected=cloudflare');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pass');
    expect(body.details.warp).toBe('off');
  });

  it('reports fail when marker missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'unexpected response',
      status: 200,
    } as Response));

    const res = await call('http://localhost/api/probe?expected=cloudflare');
    const body = await res.json();
    expect(body.status).toBe('fail');
  });

  it('reports unknown for resolvers without a probe', async () => {
    const res = await call('http://localhost/api/probe?expected=google');
    const body = await res.json();
    expect(body.status).toBe('unknown');
  });

  it('reports unknown for unknown resolver', async () => {
    const res = await call('http://localhost/api/probe?expected=nope');
    const body = await res.json();
    expect(body.status).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm test tests/api/probe.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write app/api/probe/route.ts**

```ts
import { NextResponse } from 'next/server';
import { probeResolver } from '@/lib/probe';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const expected = url.searchParams.get('expected');
  if (!expected) {
    return NextResponse.json({ status: 'unknown', reason: 'missing expected param' });
  }
  const result = await probeResolver(expected);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm test tests/api/probe.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/probe/ tests/api/probe.test.ts
git commit -m "feat(api): /api/probe verification route"
```

---

## Task 12: shadcn UI primitives + utility

**Files:**
- Create: `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/radio-group.tsx`, `components/ui/tabs.tsx`

We're not running `shadcn init` (it requires interactive prompts); instead we hand-write equivalent primitives styled with Tailwind. Same structure shadcn would generate.

- [ ] **Step 1: Install Radix dependencies**

Run: `pnpm add @radix-ui/react-radio-group @radix-ui/react-tabs @radix-ui/react-slot class-variance-authority`

- [ ] **Step 2: Create lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create components/ui/button.tsx**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-neutral-50 hover:bg-neutral-800',
        outline: 'border border-neutral-200 bg-white hover:bg-neutral-50',
        ghost: 'hover:bg-neutral-100',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3',
        lg: 'h-12 px-8 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 4: Create components/ui/card.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl border border-neutral-200 bg-white shadow-sm', className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-semibold leading-none', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';
```

- [ ] **Step 5: Create components/ui/input.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

- [ ] **Step 6: Create components/ui/radio-group.tsx**

```tsx
'use client';
import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid grid-cols-3 gap-2', className)} {...props} />
));
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { label: string }
>(({ className, label, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-medium data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-900 data-[state=checked]:text-white',
      className
    )}
    {...props}
  >
    {label}
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';
```

- [ ] **Step 7: Create components/ui/tabs.tsx**

```tsx
'use client';
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex h-10 items-center justify-center rounded-lg bg-neutral-100 p-1', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = TabsPrimitive.Content;
```

- [ ] **Step 8: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add lib/utils.ts components/ui/ package.json pnpm-lock.yaml
git commit -m "feat(ui): add shadcn-style UI primitives"
```

---

## Task 13: FamilyToggle + ResolverPicker + CustomResolverForm

**Files:**
- Create: `components/FamilyToggle.tsx`, `components/ResolverPicker.tsx`, `components/CustomResolverForm.tsx`

- [ ] **Step 1: Create components/FamilyToggle.tsx**

```tsx
'use client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type IPFamily = 'v4' | 'v6' | 'both';

export function FamilyToggle({ value, onChange }: { value: IPFamily; onChange: (v: IPFamily) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700">IP family</label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as IPFamily)}>
        <RadioGroupItem value="v4" label="IPv4" />
        <RadioGroupItem value="v6" label="IPv6" />
        <RadioGroupItem value="both" label="Both" />
      </RadioGroup>
    </div>
  );
}
```

- [ ] **Step 2: Create components/ResolverPicker.tsx**

```tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RESOLVERS } from '@/lib/resolvers';
import { cn } from '@/lib/utils';

export function ResolverPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {Object.values(RESOLVERS).map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={cn(
            'w-full text-left rounded-xl border bg-white p-4 transition-colors',
            value === r.key ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-300'
          )}
        >
          <div className="font-semibold">{r.name}</div>
          <div className="text-sm text-neutral-600">{r.description}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create components/CustomResolverForm.tsx**

```tsx
'use client';
import { Input } from '@/components/ui/input';

export type CustomResolver = { url: string; ips: string };

export function CustomResolverForm({
  value,
  onChange,
}: {
  value: CustomResolver;
  onChange: (v: CustomResolver) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">DoH URL</label>
        <Input
          type="url"
          placeholder="https://your-resolver.example/dns-query"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">Server addresses (optional, comma-separated)</label>
        <Input
          type="text"
          placeholder="9.9.9.9, 2620:fe::fe"
          value={value.ips}
          onChange={(e) => onChange({ ...value, ips: e.target.value })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/FamilyToggle.tsx components/ResolverPicker.tsx components/CustomResolverForm.tsx
git commit -m "feat(ui): resolver picker, family toggle, custom form"
```

---

## Task 14: InstallSteps component

**Files:**
- Create: `components/InstallSteps.tsx`

- [ ] **Step 1: Create components/InstallSteps.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InstallSteps({ profileHref }: { profileHref: string }) {
  const [caInstalled, setCaInstalled] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Step 1 — Install root certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-neutral-600">
            Tap below to download the trust profile. iOS will ask you to install it from Settings.
            Then go to <span className="font-medium">Settings &gt; General &gt; About &gt; Certificate Trust Settings</span> and turn on the toggle for DNS Installer CA.
          </p>
          <Button asChild>
            <a href="/api/root-ca">Download root certificate</a>
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={caInstalled}
              onChange={(e) => setCaInstalled(e.target.checked)}
              className="h-4 w-4"
            />
            I've installed and trusted the root certificate
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2 — Install DNS profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-neutral-600">
            With the root certificate trusted, the DNS profile will show a green "Verified" badge.
          </p>
          <Button asChild disabled={!caInstalled} aria-disabled={!caInstalled}>
            <a href={caInstalled ? profileHref : '#'}>Install DNS profile</a>
          </Button>
          {!caInstalled && (
            <p className="text-xs text-neutral-500">Complete Step 1 first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/InstallSteps.tsx
git commit -m "feat(ui): two-step install component"
```

---

## Task 15: Main installer page (`/`)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite app/page.tsx**

```tsx
'use client';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResolverPicker } from '@/components/ResolverPicker';
import { FamilyToggle, type IPFamily } from '@/components/FamilyToggle';
import { CustomResolverForm, type CustomResolver } from '@/components/CustomResolverForm';
import { InstallSteps } from '@/components/InstallSteps';

export default function Home() {
  const [mode, setMode] = useState<'curated' | 'custom'>('curated');
  const [resolver, setResolver] = useState<string>('cloudflare');
  const [family, setFamily] = useState<IPFamily>('both');
  const [custom, setCustom] = useState<CustomResolver>({ url: '', ips: '' });

  const profileHref = useMemo(() => {
    if (mode === 'curated') {
      return `/api/profile?resolver=${encodeURIComponent(resolver)}&family=${family}`;
    }
    const params = new URLSearchParams();
    params.set('url', custom.url);
    if (custom.ips.trim()) params.set('ips', custom.ips);
    return `/api/profile?${params.toString()}`;
  }, [mode, resolver, family, custom]);

  const canInstall =
    mode === 'curated' || (custom.url.startsWith('https://') && custom.url.length > 10);

  return (
    <main className="mx-auto max-w-md p-5 pb-16 space-y-6">
      <header className="space-y-1 pt-6">
        <h1 className="text-2xl font-semibold">Encrypted DNS for iPhone</h1>
        <p className="text-sm text-neutral-600">
          Install an encrypted-DNS profile in a couple of taps. <a href="/about" className="underline">How it works</a>.
        </p>
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'curated' | 'custom')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="curated">Curated</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="space-y-4 pt-4">
          <ResolverPicker value={resolver} onChange={setResolver} />
          <FamilyToggle value={family} onChange={setFamily} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 pt-4">
          <CustomResolverForm value={custom} onChange={setCustom} />
        </TabsContent>
      </Tabs>

      {canInstall && <InstallSteps profileHref={profileHref} />}

      <footer className="pt-4 text-center text-xs text-neutral-500">
        After installing, <a href={`/test?expected=${resolver}`} className="underline">verify it's working</a>.
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Verify dev server renders the page**

Run: `pnpm dev` then `curl -s http://localhost:3000 | grep "Encrypted DNS"`
Expected: matches "Encrypted DNS for iPhone". Stop the server.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): installer page wiring picker + steps"
```

---

## Task 16: TestResult + verification page

**Files:**
- Create: `components/TestResult.tsx`, `app/test/page.tsx`

- [ ] **Step 1: Create components/TestResult.tsx**

```tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ProbeResult =
  | { status: 'pass'; details: Record<string, string> }
  | { status: 'fail'; reason: string }
  | { status: 'unknown'; reason: string };

export function TestResult({ result }: { result: ProbeResult | null }) {
  if (!result) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-neutral-500">Checking…</CardContent>
      </Card>
    );
  }
  const tone =
    result.status === 'pass' ? 'bg-emerald-50 border-emerald-300' :
    result.status === 'fail' ? 'bg-rose-50 border-rose-300' :
    'bg-amber-50 border-amber-300';
  return (
    <Card className={cn('border', tone)}>
      <CardHeader>
        <CardTitle>
          {result.status === 'pass' && 'Working'}
          {result.status === 'fail' && 'Not detected'}
          {result.status === 'unknown' && 'Could not verify'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result.status === 'pass' && (
          <dl className="text-sm space-y-1">
            {Object.entries(result.details).slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {result.status !== 'pass' && (
          <p className="text-sm text-neutral-700">{result.reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create app/test/page.tsx**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { TestResult } from '@/components/TestResult';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function TestPageInner() {
  const params = useSearchParams();
  const expected = params.get('expected') ?? 'cloudflare';
  const isCustom = expected === 'custom' || params.get('url');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isCustom) {
      setResult({
        status: 'unknown',
        reason: 'Automatic verification is not available for custom resolvers. Try a DNS leak test site.',
      });
      return;
    }
    fetch(`/api/probe?expected=${encodeURIComponent(expected)}`)
      .then((r) => r.json())
      .then(setResult)
      .catch((err) => setResult({ status: 'unknown', reason: err.message }));
  }, [expected, isCustom]);

  return (
    <main className="mx-auto max-w-md p-5 pb-16 space-y-4">
      <header className="pt-6 space-y-1">
        <h1 className="text-2xl font-semibold">Verify your DNS</h1>
        <p className="text-sm text-neutral-600">
          We're checking whether your DNS is going through <span className="font-medium">{expected}</span>.
        </p>
      </header>
      <TestResult result={result} />
      <a href="/" className="block text-center text-sm underline">Back to installer</a>
    </main>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<main className="p-5">Loading…</main>}>
      <TestPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/TestResult.tsx app/test/
git commit -m "feat(ui): /test verification page"
```

---

## Task 17: About page

**Files:**
- Create: `app/about/page.tsx`

- [ ] **Step 1: Create app/about/page.tsx**

```tsx
export default function About() {
  return (
    <main className="mx-auto max-w-md p-5 pb-16 space-y-6">
      <header className="pt-6">
        <h1 className="text-2xl font-semibold">How this works</h1>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">What it does</h2>
        <p className="text-sm text-neutral-700">
          This site delivers an Apple <code>.mobileconfig</code> profile that configures your
          iPhone to use a specific DNS-over-HTTPS resolver. Once installed, all DNS lookups on
          your device go through that resolver, encrypted in transit.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Why two installs</h2>
        <p className="text-sm text-neutral-700">
          The DNS profile is signed by a self-signed certificate authority so iOS can verify it
          wasn't tampered with. You install the root certificate first (Step 1) and the DNS
          profile second (Step 2). This avoids paid signing certificates while keeping the
          install flow transparent.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">What we don't do</h2>
        <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-1">
          <li>We don't store anything about you — there's no account, no analytics.</li>
          <li>We don't proxy your DNS. Your phone talks directly to the resolver you choose.</li>
          <li>We don't have access to your DNS traffic.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Existing alternatives</h2>
        <p className="text-sm text-neutral-700">
          If you want a fully-signed install with no root-certificate step, use the resolver's
          own installer: Cloudflare at <a className="underline" href="https://one.one.one.one">one.one.one.one</a>,
          AdGuard at <a className="underline" href="https://adguard-dns.io/en/public-dns.html">adguard-dns.io</a>, etc.
        </p>
      </section>

      <a href="/" className="block text-center text-sm underline">Back to installer</a>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/about/
git commit -m "feat(ui): /about explainer page"
```

---

## Task 18: vercel.ts config

**Files:**
- Create: `vercel.ts`

Per the spec. Most cache headers are set in route handlers; this file is minimal — just declares the framework.

- [ ] **Step 1: Install @vercel/config**

Run: `pnpm add -D @vercel/config`

- [ ] **Step 2: Create vercel.ts**

```ts
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
};

export default config;
```

- [ ] **Step 3: Commit**

```bash
git add vercel.ts package.json pnpm-lock.yaml
git commit -m "chore: vercel.ts config"
```

---

## Task 19: Manual smoke test checklist

**Files:**
- Create: `docs/smoke-test.md`

- [ ] **Step 1: Create docs/smoke-test.md**

```markdown
# Manual smoke test

Run before each production deploy. Automated tests verify profile bytes; this
verifies that iOS actually accepts them.

## Prerequisites

- Real iPhone running iOS 14+
- Deployed preview or production URL
- CA env vars set on the deployment

## Steps

1. **Install root CA.** On the iPhone, open the deployed URL in Safari. Tap
   **Download root certificate**. iOS shows "Profile Downloaded". Open
   Settings → General → VPN & Device Management. Tap the profile, install,
   enter passcode. ✅ Confirm install succeeds with no error.

2. **Trust the root CA.** Settings → General → About → Certificate Trust
   Settings. Toggle on "DNS Installer CA". ✅ Confirm toggle is enabled.

3. **Install Cloudflare v4 profile.** Back in Safari, tick "I've installed
   and trusted", tap **Install DNS profile**. Settings opens. ✅ Confirm
   install sheet shows green "Verified by DNS Installer CA" badge. Install.

4. **Verify on `/test`.** Tap "verify it's working" link. ✅ Confirm green
   "Working" card with trace details.

5. **Cross-check.** Visit https://1.1.1.1/help in Safari. ✅ Confirm
   "Using DNS over HTTPS (DoH)" is YES.

6. **Custom resolver path.** Back on `/`, switch to Custom tab. Enter
   `https://dns.nextdns.io/<your-profile-id>` and no IPs. Install profile
   (overwrites the previous one). ✅ Confirm install works.

7. **Visit `/test?url=...`.** ✅ Confirm "Could not verify" amber card
   with the manual-check message.

8. **Cleanup.** Settings → General → VPN & Device Management. Remove DNS
   profile, then remove root CA profile. ✅ Confirm device is back to
   default DNS.

## Failure modes to watch

- Step 1 fails with "Unable to verify the integrity": CA cert generation
  produced a malformed cert. Regenerate with `pnpm generate-ca`.
- Step 3 shows yellow "Unsigned" instead of green "Verified": the root CA
  isn't trusted yet (Step 2 missed). The install will still work but the
  badge is wrong.
- Step 4 stuck on "Checking…": probe endpoint is unreachable from the
  Function region. Confirm CF/quad9 trace URLs are accessible.
```

- [ ] **Step 2: Commit**

```bash
git add docs/smoke-test.md
git commit -m "docs: manual smoke-test checklist"
```

---

## Task 20: Full test sweep + final commit

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: all suites pass. Expected total: ~24 tests across smoke, ca, resolvers, plist, sign, root-ca, profile, probe.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: completes without errors. Note: build will use whatever `CA_CERT_PEM` and `CA_KEY_PEM` are in `.env.local` (or skip static generation of `/api/root-ca` if absent — handler returns 500 in that case).

- [ ] **Step 4: Local end-to-end (requires generating a dev CA)**

Run:
```bash
pnpm generate-ca > .env.local.tmp
# Reformat the output into .env.local — the script prints quoted values
# suitable for pasting; convert into key=value pairs:
sed 's/^CA_CERT_PEM=/CA_CERT_PEM=/; s/^CA_KEY_PEM=/CA_KEY_PEM=/' .env.local.tmp > .env.local
rm .env.local.tmp
pnpm dev
```
Then in another shell:
```bash
curl -sS -o /tmp/ca.mobileconfig http://localhost:3000/api/root-ca
file /tmp/ca.mobileconfig
curl -sS -o /tmp/cloudflare-v4.mobileconfig 'http://localhost:3000/api/profile?resolver=cloudflare&family=v4'
file /tmp/cloudflare-v4.mobileconfig
```
Expected: `/tmp/ca.mobileconfig` reports as XML; `/tmp/cloudflare-v4.mobileconfig` reports as data (CMS DER binary). Stop the dev server.

- [ ] **Step 5: Final commit if anything changed**

```bash
git status
# If there are any leftover changes from the e2e run, decide what to keep.
# .env.local should be gitignored already.
```

- [ ] **Step 6: Confirm the project is shippable**

Project is feature-complete per spec. To deploy:

1. Run `pnpm generate-ca` locally (without the `fixture` arg).
2. Paste the printed `CA_CERT_PEM` and `CA_KEY_PEM` into the Vercel project's environment variables.
3. `vercel --prod` (or push to the linked branch).
4. Run the manual smoke test in `docs/smoke-test.md` against the deployed URL.

---

## Self-review notes

- Every spec section has at least one task implementing it (architecture, file layout, data flow, error handling, testing).
- Curated path tested via `tests/api/profile.test.ts`; custom path tested with the no-store cache assertion + RFC1918 rejection.
- Self-signed CA install flow appears in both the InstallSteps component and the about page.
- Verification page covers both pass/fail/unknown branches and the custom-resolver "manual check" fallback.
- No placeholders, no "TODO", no "similar to Task N" — every step has runnable content.
