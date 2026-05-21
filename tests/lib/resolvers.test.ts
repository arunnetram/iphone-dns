import { describe, it, expect } from 'vitest';
import { RESOLVERS, getResolver } from '@/lib/resolvers';

describe('lib/resolvers', () => {
  it('has the five curated resolvers', () => {
    expect(Object.keys(RESOLVERS).sort()).toEqual(
      ['adguard', 'cloudflare', 'cloudflare-families', 'google', 'quad9']
    );
  });

  it('every resolver has valid DoH URL and at least one v4 + v6 address', () => {
    for (const [key, r] of Object.entries(RESOLVERS)) {
      expect(r.doh.url.startsWith('https://')).toBe(true);
      expect(r.addresses.v4.length).toBeGreaterThan(0);
      expect(r.addresses.v6.length).toBeGreaterThan(0);
      expect(r.key).toBe(key);
    }
  });

  it('getResolver returns the resolver by key', () => {
    expect(getResolver('cloudflare')?.name).toBe('Cloudflare');
  });

  it('getResolver returns null for unknown key', () => {
    expect(getResolver('nope')).toBeNull();
  });
});
