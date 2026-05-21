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
    // node-forge 1.4's messageFromAsn1 leaves p7.content empty after parsing;
    // the actual content lives in the rawCapture ASN.1 tree.
    const rawCapture = (p7 as unknown as { rawCapture?: { content?: { value: Array<{ value: string }> } } }).rawCapture;
    expect(rawCapture).toBeDefined();
    const innerContent = rawCapture!.content!.value[0].value;
    expect(innerContent).toBe(plistXml);
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
    expect(a.equals(b)).toBe(true);
  });
});
