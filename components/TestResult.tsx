'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ProbeResult =
  | { status: 'pass'; details: Record<string, string> }
  | { status: 'fail'; reason: string }
  | { status: 'unknown'; reason: string };

export function TestResult({ result }: { result: ProbeResult | null }) {
  if (!result) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-neutral-500">Checking…</CardContent>
      </Card>
    );
  }
  const tone =
    result.status === 'pass' ? 'bg-emerald-50 border-emerald-300' :
    result.status === 'fail' ? 'bg-rose-50 border-rose-300' :
    'bg-amber-50 border-amber-300';
  return (
    <Card className={cn('border', tone)}>
      <CardHeader>
        <CardTitle>
          {result.status === 'pass' && 'Working'}
          {result.status === 'fail' && 'Not detected'}
          {result.status === 'unknown' && 'Could not verify'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result.status === 'pass' && (
          <dl className="text-sm space-y-1">
            {Object.entries(result.details).slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {result.status !== 'pass' && (
          <p className="text-sm text-neutral-700">{result.reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
