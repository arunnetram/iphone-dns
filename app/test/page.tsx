'use client';
import { useEffect, useState, Suspense } from 'react';
import { TestResult } from '@/components/TestResult';
import { getResolver } from '@/lib/resolvers';
import { useSearchParams } from 'next/navigation';

type ProbeResult =
  | { status: 'pass'; details: Record<string, string> }
  | { status: 'fail'; reason: string }
  | { status: 'unknown'; reason: string };

function TestPageInner() {
  const params = useSearchParams();
  const expected = params.get('expected') ?? 'cloudflare';
  const isCustom = expected === 'custom' || !!params.get('url');
  const [result, setResult] = useState<ProbeResult | null>(null);

  const resolver = isCustom ? null : getResolver(expected);
  const resolverName = resolver?.name ?? (isCustom ? 'Custom resolver' : expected);
  const deviceCheckUrl = resolver?.deviceCheckUrl;

  useEffect(() => {
    if (isCustom) {
      setResult({
        status: 'unknown',
        reason: 'Automatic verification isn’t available for custom resolvers. Try a DNS leak test site like dnsleaktest.com.',
      });
      return;
    }
    fetch(`/api/probe?expected=${encodeURIComponent(expected)}`)
      .then((r) => r.json())
      .then(setResult)
      .catch((err) => setResult({ status: 'unknown', reason: err.message }));
  }, [expected, isCustom]);

  return (
    <main className="mx-auto max-w-md p-5 pb-16 space-y-4">
      <header className="pt-6 space-y-1">
        <h1 className="text-2xl font-semibold">Verify your DNS</h1>
        <p className="text-sm text-neutral-600">
          Checking whether <span className="font-medium">{resolverName}</span> is responding.
        </p>
      </header>
      <TestResult result={result} resolverName={resolverName} deviceCheckUrl={deviceCheckUrl} />
      <a href="/" className="block text-center text-sm underline">Back to installer</a>
    </main>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<main className="p-5">Loading…</main>}>
      <TestPageInner />
    </Suspense>
  );
}
