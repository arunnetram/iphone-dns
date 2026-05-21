import { getResolver } from './resolvers';

export type ProbeResult =
  | { status: 'pass'; details: Record<string, string> }
  | { status: 'fail'; reason: string }
  | { status: 'unknown'; reason: string };

export async function probeResolver(resolverKey: string): Promise<ProbeResult> {
  const resolver = getResolver(resolverKey);
  if (!resolver) return { status: 'unknown', reason: 'unknown resolver key' };
  if (!resolver.probe) {
    return { status: 'unknown', reason: 'no probe configured for this resolver' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(resolver.probe.traceUrl, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      return { status: 'unknown', reason: `probe returned HTTP ${res.status}` };
    }
    const text = await res.text();
    if (!text.includes(resolver.probe.expectedMarker)) {
      return { status: 'fail', reason: 'expected marker not found in probe response' };
    }
    // Parse trace-style key=value lines into a details object (Cloudflare format).
    const details: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) details[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return { status: 'pass', details };
  } catch (err) {
    return { status: 'unknown', reason: (err as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}
