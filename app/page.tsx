'use client';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResolverPicker } from '@/components/ResolverPicker';
import { FamilyToggle, type IPFamily } from '@/components/FamilyToggle';
import { CustomResolverForm, type CustomResolver } from '@/components/CustomResolverForm';
import { InstallSteps } from '@/components/InstallSteps';

export default function Home() {
  const [mode, setMode] = useState<'curated' | 'custom'>('curated');
  const [resolver, setResolver] = useState<string>('cloudflare');
  const [family, setFamily] = useState<IPFamily>('both');
  const [custom, setCustom] = useState<CustomResolver>({ url: '', ips: '' });

  const profileHref = useMemo(() => {
    if (mode === 'curated') {
      return `/api/profile?resolver=${encodeURIComponent(resolver)}&family=${family}`;
    }
    const params = new URLSearchParams();
    params.set('url', custom.url);
    if (custom.ips.trim()) params.set('ips', custom.ips);
    return `/api/profile?${params.toString()}`;
  }, [mode, resolver, family, custom]);

  const canInstall =
    mode === 'curated' || (custom.url.startsWith('https://') && custom.url.length > 10);

  return (
    <main className="mx-auto max-w-md p-5 pb-16 space-y-6">
      <header className="space-y-1 pt-6">
        <h1 className="text-2xl font-semibold">Encrypted DNS for iPhone</h1>
        <p className="text-sm text-neutral-600">
          Install an encrypted-DNS profile in a couple of taps. <a href="/about" className="underline">How it works</a>.
        </p>
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'curated' | 'custom')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="curated">Curated</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="space-y-4 pt-4">
          <ResolverPicker value={resolver} onChange={setResolver} />
          <FamilyToggle value={family} onChange={setFamily} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 pt-4">
          <CustomResolverForm value={custom} onChange={setCustom} />
        </TabsContent>
      </Tabs>

      {canInstall && <InstallSteps profileHref={profileHref} />}

      <footer className="pt-4 text-center text-xs text-neutral-500">
        After installing, <a href={`/test?expected=${resolver}`} className="underline">verify it&apos;s working</a>.
      </footer>
    </main>
  );
}
