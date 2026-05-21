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
