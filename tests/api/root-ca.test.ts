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
