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

function extractInnerContent(body: Buffer): string {
  // Parse CMS SignedData and pull embedded content out of rawCapture
  // (node-forge 1.4 doesn't populate p7.content after parsing).
  const asn1 = forge.asn1.fromDer(body.toString('binary'));
  const p7 = forge.pkcs7.messageFromAsn1(asn1) as unknown as {
    rawCapture: { content: { value: Array<{ value: string }> } };
  };
  return p7.rawCapture.content.value[0].value;
}

describe('GET /api/profile', () => {
  it('returns a signed profile for a curated resolver', async () => {
    const res = await call('http://localhost/api/profile?resolver=cloudflare&family=v4');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/x-apple-aspen-config');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    const body = Buffer.from(await res.arrayBuffer());
    const inner = extractInnerContent(body);
    expect(inner).toContain('cloudflare-dns.com');
    expect(inner).toContain('1.1.1.1');
  });

  it('supports family=v6', async () => {
    const res = await call('http://localhost/api/profile?resolver=cloudflare&family=v6');
    expect(res.status).toBe(200);
    const body = Buffer.from(await res.arrayBuffer());
    const inner = extractInnerContent(body);
    expect(inner).toContain('2606:4700:4700::1111');
    expect(inner).not.toContain('1.1.1.1');
  });

  it('supports family=both', async () => {
    const res = await call('http://localhost/api/profile?resolver=cloudflare&family=both');
    const body = Buffer.from(await res.arrayBuffer());
    const inner = extractInnerContent(body);
    expect(inner).toContain('1.1.1.1');
    expect(inner).toContain('2606:4700:4700::1111');
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
