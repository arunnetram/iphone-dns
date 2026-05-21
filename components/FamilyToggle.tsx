'use client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type IPFamily = 'v4' | 'v6' | 'both';

export function FamilyToggle({ value, onChange }: { value: IPFamily; onChange: (v: IPFamily) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700">IP family</label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as IPFamily)}>
        <RadioGroupItem value="v4" label="IPv4" />
        <RadioGroupItem value="v6" label="IPv6" />
        <RadioGroupItem value="both" label="Both" />
      </RadioGroup>
    </div>
  );
}
