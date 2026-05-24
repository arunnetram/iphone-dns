'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InstallSteps({ profileHref }: { profileHref: string }) {
  const [caInstalled, setCaInstalled] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Step 1 — Install root certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-neutral-600">
            Tap below to download the trust profile. iOS will ask you to install it from Settings.
            Then go to <span className="font-medium">Settings &gt; General &gt; About &gt; Certificate Trust Settings</span> and turn on the toggle for DNS Installer CA.
          </p>
          <Button asChild>
            <a href="/api/root-ca">Download root certificate</a>
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={caInstalled}
              onChange={(e) => setCaInstalled(e.target.checked)}
              className="h-4 w-4"
            />
            I've installed and trusted the root certificate
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2 — Install DNS profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-neutral-600">
            With the root certificate trusted, the DNS profile will show a green "Verified" badge.
          </p>
          {caInstalled ? (
            <Button asChild>
              <a href={profileHref}>Install DNS profile</a>
            </Button>
          ) : (
            <Button type="button" disabled aria-disabled="true">
              Install DNS profile
            </Button>
          )}
          {!caInstalled && (
            <p className="text-xs text-neutral-500">Complete Step 1 first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
