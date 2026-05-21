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
