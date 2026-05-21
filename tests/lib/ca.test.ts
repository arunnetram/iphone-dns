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
