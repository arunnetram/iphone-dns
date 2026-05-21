export default function About() {
  return (
    <main className="mx-auto max-w-md p-5 pb-16 space-y-6">
      <header className="pt-6">
        <h1 className="text-2xl font-semibold">How this works</h1>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">What it does</h2>
        <p className="text-sm text-neutral-700">
          This site delivers an Apple <code>.mobileconfig</code> profile that configures your
          iPhone to use a specific DNS-over-HTTPS resolver. Once installed, all DNS lookups on
          your device go through that resolver, encrypted in transit.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Why two installs</h2>
        <p className="text-sm text-neutral-700">
          The DNS profile is signed by a self-signed certificate authority so iOS can verify it
          wasn&apos;t tampered with. You install the root certificate first (Step 1) and the DNS
          profile second (Step 2). This avoids paid signing certificates while keeping the
          install flow transparent.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">What we don&apos;t do</h2>
        <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-1">
          <li>We don&apos;t store anything about you — there&apos;s no account, no analytics.</li>
          <li>We don&apos;t proxy your DNS. Your phone talks directly to the resolver you choose.</li>
          <li>We don&apos;t have access to your DNS traffic.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Existing alternatives</h2>
        <p className="text-sm text-neutral-700">
          If you want a fully-signed install with no root-certificate step, use the resolver&apos;s
          own installer: Cloudflare at <a className="underline" href="https://one.one.one.one">one.one.one.one</a>,
          AdGuard at <a className="underline" href="https://adguard-dns.io/en/public-dns.html">adguard-dns.io</a>, etc.
        </p>
      </section>

      <a href="/" className="block text-center text-sm underline">Back to installer</a>
    </main>
  );
}
