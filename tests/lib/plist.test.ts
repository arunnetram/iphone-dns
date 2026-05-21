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
      fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
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
