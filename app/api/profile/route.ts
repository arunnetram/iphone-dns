import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCA } from '@/lib/ca';
import { getResolver } from '@/lib/resolvers';
import { buildDnsProfilePlist } from '@/lib/plist';
import { signProfile } from '@/lib/sign';

const FamilySchema = z.enum(['v4', 'v6', 'both']);

const CuratedSchema = z.object({
  resolver: z.string().min(1),
  family: FamilySchema,
});

// IP validation: reject loopback, link-local, private ranges, 0.0.0.0.
function isAllowedIP(ip: string): boolean {
  if (ip === '0.0.0.0' || ip === '::1' || ip === '127.0.0.1') return false;
  if (ip.startsWith('127.')) return false;
  if (ip.startsWith('10.')) return false;
  if (ip.startsWith('192.168.')) return false;
  if (ip.startsWith('169.254.')) return false;
  if (ip.startsWith('fe80:') || ip.startsWith('fe80::')) return false;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return false;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return false;
  return true;
}

const IPSchema = z.string().refine(isAllowedIP, { message: 'disallowed IP address' });

const CustomSchema = z.object({
  url: z.string().url().startsWith('https://').max(2048),
  ips: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []))
    .pipe(z.array(IPSchema).max(8)),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  // Curated path
  if (params.resolver) {
    const parsed = CuratedSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_input', field: parsed.error.issues[0]?.path[0], detail: parsed.error.message },
        { status: 400 }
      );
    }
    const resolver = getResolver(parsed.data.resolver);
    if (!resolver) {
      return NextResponse.json({ error: 'unknown_resolver' }, { status: 404 });
    }
    const addresses =
      parsed.data.family === 'v4'
        ? resolver.addresses.v4
        : parsed.data.family === 'v6'
          ? resolver.addresses.v6
          : [...resolver.addresses.v4, ...resolver.addresses.v6];

    return buildSignedResponse({
      displayName: `DNS: ${resolver.name} (${parsed.data.family.toUpperCase()})`,
      payloadIdentifier: `app.dnsinstaller.${resolver.key}.${parsed.data.family}`,
      dohUrl: resolver.doh.url,
      serverAddresses: addresses,
      cacheKey: `${resolver.key}:${parsed.data.family}`,
      cacheable: true,
    });
  }

  // Custom path
  if (params.url) {
    const parsed = CustomSchema.safeParse({ url: params.url, ips: params.ips });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_input', field: parsed.error.issues[0]?.path.join('.'), detail: parsed.error.message },
        { status: 400 }
      );
    }
    const hostname = new URL(parsed.data.url).hostname;
    return buildSignedResponse({
      displayName: `DNS: ${hostname}`,
      payloadIdentifier: `app.dnsinstaller.custom.${hashKey(parsed.data.url + '|' + parsed.data.ips.join(','))}`,
      dohUrl: parsed.data.url,
      serverAddresses: parsed.data.ips,
      cacheKey: 'custom:' + parsed.data.url + ':' + parsed.data.ips.join(','),
      cacheable: false,
    });
  }

  return NextResponse.json({ error: 'missing_params' }, { status: 400 });
}

function buildSignedResponse(input: {
  displayName: string;
  payloadIdentifier: string;
  dohUrl: string;
  serverAddresses: string[];
  cacheKey: string;
  cacheable: boolean;
}) {
  try {
    const ca = getCA();
    const plistXml = buildDnsProfilePlist(input);
    const signed = signProfile(plistXml, ca.cert, ca.key);
    return new NextResponse(new Uint8Array(signed), {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': `attachment; filename="${input.payloadIdentifier}.mobileconfig"`,
        'Cache-Control': input.cacheable
          ? 'public, max-age=31536000, immutable'
          : 'private, no-store',
      },
    });
  } catch (err) {
    console.error('profile route failed:', err);
    return NextResponse.json({ error: 'signing_failed' }, { status: 500 });
  }
}

function hashKey(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
