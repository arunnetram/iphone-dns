'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RESOLVERS } from '@/lib/resolvers';
import { cn } from '@/lib/utils';

export function ResolverPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {Object.values(RESOLVERS).map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={cn(
            'w-full text-left rounded-xl border bg-white p-4 transition-colors',
            value === r.key ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-300'
          )}
        >
          <div className="font-semibold">{r.name}</div>
          <div className="text-sm text-neutral-600">{r.description}</div>
        </button>
      ))}
    </div>
  );
}
