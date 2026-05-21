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
