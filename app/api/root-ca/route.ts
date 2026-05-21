import { NextResponse } from 'next/server';
import { getCA } from '@/lib/ca';
import { buildRootCAPlist } from '@/lib/plist';
import forge from 'node-forge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ca = getCA();
    const certPem = forge.pki.certificateToPem(ca.cert);
    const xml = buildRootCAPlist(certPem);
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': 'attachment; filename="dns-installer-root-ca.mobileconfig"',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('root-ca route failed:', err);
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
}
