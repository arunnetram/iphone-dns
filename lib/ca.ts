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
