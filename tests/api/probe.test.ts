import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
});

async function call(url: string) {
  const { GET } = await import('@/app/api/probe/route');
  return GET(new Request(url));
}

describe('GET /api/probe', () => {
  it('reports pass when expected marker is in trace response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'fl=abc\nh=cloudflare\nwarp=off\n',
      status: 200,
    } as Response));

    const res = await call('http://localhost/api/probe?expected=cloudflare');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pass');
    expect(body.details.warp).toBe('off');
  });

  it('reports fail when marker missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'unexpected response',
      status: 200,
    } as Response));

    const res = await call('http://localhost/api/probe?expected=cloudflare');
    const body = await res.json();
    expect(body.status).toBe('fail');
  });

  it('reports unknown for resolvers without a probe', async () => {
    const res = await call('http://localhost/api/probe?expected=google');
    const body = await res.json();
    expect(body.status).toBe('unknown');
  });

  it('reports unknown for unknown resolver', async () => {
    const res = await call('http://localhost/api/probe?expected=nope');
    const body = await res.json();
    expect(body.status).toBe('unknown');
  });
});
