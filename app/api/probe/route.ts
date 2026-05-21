import { NextResponse } from 'next/server';
import { probeResolver } from '@/lib/probe';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const expected = url.searchParams.get('expected');
  if (!expected) {
    return NextResponse.json({ status: 'unknown', reason: 'missing expected param' });
  }
  const result = await probeResolver(expected);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
