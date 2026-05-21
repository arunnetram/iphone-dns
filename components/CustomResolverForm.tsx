'use client';
import { Input } from '@/components/ui/input';

export type CustomResolver = { url: string; ips: string };

export function CustomResolverForm({
  value,
  onChange,
}: {
  value: CustomResolver;
  onChange: (v: CustomResolver) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">DoH URL</label>
        <Input
          type="url"
          placeholder="https://your-resolver.example/dns-query"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">Server addresses (optional, comma-separated)</label>
        <Input
          type="text"
          placeholder="9.9.9.9, 2620:fe::fe"
          value={value.ips}
          onChange={(e) => onChange({ ...value, ips: e.target.value })}
        />
      </div>
    </div>
  );
}
