# Manual smoke test

Run before each production deploy. Automated tests verify profile bytes; this
verifies that iOS actually accepts them.

## Prerequisites

- Real iPhone running iOS 14+
- Deployed preview or production URL
- CA env vars set on the deployment

## Steps

1. **Install root CA.** On the iPhone, open the deployed URL in Safari. Tap
   **Download root certificate**. iOS shows "Profile Downloaded". Open
   Settings → General → VPN & Device Management. Tap the profile, install,
   enter passcode. Confirm install succeeds with no error.

2. **Trust the root CA.** Settings → General → About → Certificate Trust
   Settings. Toggle on "DNS Installer CA". Confirm toggle is enabled.

3. **Install Cloudflare v4 profile.** Back in Safari, tick "I've installed
   and trusted", tap **Install DNS profile**. Settings opens. Confirm
   install sheet shows green "Verified by DNS Installer CA" badge. Install.

4. **Verify on `/test`.** Tap "verify it's working" link. Confirm green
   "Working" card with trace details.

5. **Cross-check.** Visit https://1.1.1.1/help in Safari. Confirm
   "Using DNS over HTTPS (DoH)" is YES.

6. **Custom resolver path.** Back on `/`, switch to Custom tab. Enter
   `https://dns.nextdns.io/<your-profile-id>` and no IPs. Install profile
   (overwrites the previous one). Confirm install works.

7. **Visit `/test?url=...`.** Confirm "Could not verify" amber card
   with the manual-check message.

8. **Cleanup.** Settings → General → VPN & Device Management. Remove DNS
   profile, then remove root CA profile. Confirm device is back to
   default DNS.

## Failure modes to watch

- Step 1 fails with "Unable to verify the integrity": CA cert generation
  produced a malformed cert. Regenerate with `pnpm generate-ca`.
- Step 3 shows yellow "Unsigned" instead of green "Verified": the root CA
  isn't trusted yet (Step 2 missed). The install will still work but the
  badge is wrong.
- Step 4 stuck on "Checking…": probe endpoint is unreachable from the
  Function region. Confirm CF/quad9 trace URLs are accessible.
