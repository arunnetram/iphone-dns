'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProbeResult =
  | { status: 'pass'; details: Record<string, string> }
  | { status: 'fail'; reason: string }
  | { status: 'unknown'; reason: string };

// Major Cloudflare PoP codes → human-readable cities. The trace endpoint
// returns the airport code of the data center that served the request.
const COLO_NAMES: Record<string, string> = {
  IAD: 'Ashburn, Virginia', EWR: 'Newark', LAX: 'Los Angeles', SJC: 'San Jose',
  DFW: 'Dallas', ORD: 'Chicago', MIA: 'Miami', SEA: 'Seattle', DEN: 'Denver',
  ATL: 'Atlanta', BOS: 'Boston', YYZ: 'Toronto', YVR: 'Vancouver', MEX: 'Mexico City',
  LHR: 'London', AMS: 'Amsterdam', FRA: 'Frankfurt', CDG: 'Paris', MAD: 'Madrid',
  MXP: 'Milan', VIE: 'Vienna', ZRH: 'Zurich', ARN: 'Stockholm', DUB: 'Dublin',
  WAW: 'Warsaw', PRG: 'Prague', BRU: 'Brussels', CPH: 'Copenhagen', HEL: 'Helsinki',
  SIN: 'Singapore', HKG: 'Hong Kong', NRT: 'Tokyo', KIX: 'Osaka', ICN: 'Seoul',
  TPE: 'Taipei', BKK: 'Bangkok', KUL: 'Kuala Lumpur', MNL: 'Manila', SYD: 'Sydney',
  AKL: 'Auckland',
  BLR: 'Bangalore', BOM: 'Mumbai', DEL: 'Delhi', MAA: 'Chennai', CCU: 'Kolkata',
  HYD: 'Hyderabad', DXB: 'Dubai', CAI: 'Cairo', JNB: 'Johannesburg', LOS: 'Lagos',
  GRU: 'São Paulo', EZE: 'Buenos Aires', SCL: 'Santiago', LIM: 'Lima', BOG: 'Bogotá',
};

function locationFromTrace(details: Record<string, string>): string | null {
  const colo = details.colo;
  if (!colo) return null;
  return COLO_NAMES[colo] ? `${COLO_NAMES[colo]} (${colo})` : colo;
}

export function TestResult({
  result,
  resolverName,
  deviceCheckUrl,
}: {
  result: ProbeResult | null;
  resolverName: string;
  deviceCheckUrl?: string;
}) {
  if (!result) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-neutral-500">Checking…</CardContent>
      </Card>
    );
  }

  if (result.status === 'pass') {
    const location = locationFromTrace(result.details);
    return (
      <div className="space-y-4">
        <Card className="border bg-emerald-50 border-emerald-300">
          <CardHeader>
            <CardTitle>{resolverName} is responding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>
              The {resolverName} DNS service is reachable and behaving as expected
              {location ? <> — this check went through their edge in <span className="font-medium">{location}</span></> : null}
              .
            </p>
            <p className="text-neutral-500 text-xs">
              Heads up: this confirms the resolver is online. It doesn&apos;t
              verify your iPhone is actually using it. Tap the button below for
              an authoritative device-side check.
            </p>
          </CardContent>
        </Card>

        {deviceCheckUrl && (
          <Button asChild size="lg" className="w-full">
            <a href={deviceCheckUrl} target="_blank" rel="noopener noreferrer">
              Verify on this device →
            </a>
          </Button>
        )}

        <details className="rounded-xl border border-neutral-200 bg-white">
          <summary className="cursor-pointer select-none p-4 text-sm font-medium text-neutral-700">
            Show technical details
          </summary>
          <div className="border-t border-neutral-100 p-4">
            <dl className="text-sm space-y-1">
              {Object.entries(result.details).slice(0, 12).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-neutral-500 font-mono">{k}</dt>
                  <dd className="font-mono break-all text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      </div>
    );
  }

  const tone =
    result.status === 'fail' ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300';

  return (
    <Card className={cn('border', tone)}>
      <CardHeader>
        <CardTitle>
          {result.status === 'fail' && `${resolverName} didn’t respond as expected`}
          {result.status === 'unknown' && 'Couldn’t verify automatically'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-neutral-700">
        <p>{result.reason}</p>
        {deviceCheckUrl && (
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={deviceCheckUrl} target="_blank" rel="noopener noreferrer">
              Try the resolver&apos;s own check →
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
