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
  payloadIdentifier: string; // e.g. "app.dnsinstaller.cloudflare.v4"
  dohUrl: string;
  serverAddresses: string[];
  cacheKey: string; // used to derive UUIDs deterministically
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
    PayloadDescription:
      'Installs the DNS Installer root certificate so DNS profiles can be verified.',
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
