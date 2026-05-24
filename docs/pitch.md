# The Postcard Problem

Every time you tap an app — Instagram, your bank, your dating app, your doctor's portal — your phone has to ask a question first: "What's the actual address for this place?" Names like `instagram.com` are friendly labels; the internet really runs on numbers.

Here's the catch: your phone asks that question *out loud, on a postcard, with no envelope*. Every WiFi router along the way reads it. So does your phone carrier. So does the hotel WiFi. So does the "Free Airport WiFi" you joined for ten seconds last Tuesday.

They all see the same thing — a running list of every app and site you touched today. Not the messages inside, just the names. But the names alone tell the story. The bank you use. The doctor you Googled at 2am. The dating app you quietly reinstalled last weekend.

And here's the *worse* catch. Because it's just a postcard, anyone in the middle can swap it. You ask "where's my bank?" and a sketchy router slips you the address of a fake one that looks identical. You type your password into the fake. That's a real attack — it has a name, it happens in hotels and conferences all the time.

What I built fixes both halves. It's a one-tap install for iPhone. No app icon, no subscription, no VPN draining the battery. After you install it, your phone stops sending postcards. Every "what's the address?" question goes inside a sealed, tamper-proof envelope to a service *you* picked. The coffee shop router sees the envelope, can't open it, can't swap it.

The fun part is you choose who opens the envelope on the other end:

- **Cloudflare** — fast and private, that's the whole pitch
- **Cloudflare for Families** — same, but quietly refuses to find porn sites and known scams (great on a kid's phone)
- **Quad9** — refuses to find hacked or malicious sites
- **AdGuard** — refuses to find ad and tracker servers, so a lot of in-app ads just don't load

Takes about thirty seconds. You won't see anything different on your phone afterwards. That's the point — it just gets quieter in the background.

---

**One-liner if they ask "wait, what does it actually *do* though?":**

> It's the difference between yelling your search history across a room versus whispering it through a private line.
