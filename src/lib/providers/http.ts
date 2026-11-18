/**
 * The only way adapters reach the network.
 *  - identifies itself honestly (no browser impersonation)
 *  - checks robots.txt for crawled pages (APIs are governed by their own terms and skip it)
 *  - at most one request per host per `minIntervalMs` (default 1 s), queued
 *  - timeout per request; retries 429 / 5xx / network errors with backoff, honouring Retry-After
 *  - never retries 401 / 403 (an access decision is respected, not worked around)
 */
import { parseRobots, robotsAllows, type RobotsRule } from "./robots";
import { ProviderError } from "./types";

export interface HttpOptions {
  userAgent?: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  /** false for official APIs (governed by their terms, not robots.txt) */
  robots?: boolean;
  signal?: AbortSignal;
  method?: "GET" | "HEAD" | "POST";
  body?: string;
  /** "manual" returns 3xx responses so the caller can vet each hop (used for admin-submitted URLs) */
  redirect?: "follow" | "manual";
}

export const DEFAULT_UA = "VELOX-catalog-bot/1.0 (+product discovery; respects robots.txt)";

export class PoliteHttp {
  readonly userAgent: string;
  private readonly minInterval: number;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly lanes = new Map<string, Promise<void>>();
  private readonly robots = new Map<string, Promise<RobotsRule[]>>();
  requests = 0;

  constructor(o: HttpOptions = {}) {
    this.userAgent = o.userAgent ?? DEFAULT_UA;
    this.minInterval = o.minIntervalMs ?? 1000;
    this.timeout = o.timeoutMs ?? 10_000;
    this.retries = o.retries ?? 2;
    this.fetchImpl = o.fetchImpl ?? fetch;
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** serialise requests per host with a minimum spacing */
  private async slot(host: string): Promise<void> {
    const prev = this.lanes.get(host) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    this.lanes.set(host, prev.then(() => next));
    await prev;
    setTimeout(release, this.minInterval);
  }

  private raw(url: string, opt: RequestOptions): Promise<Response> {
    const signals = [AbortSignal.timeout(this.timeout), ...(opt.signal ? [opt.signal] : [])];
    this.requests++;
    return this.fetchImpl(url, {
      method: opt.method ?? "GET", body: opt.body, redirect: opt.redirect ?? "follow", cache: "no-store",
      headers: { "user-agent": this.userAgent, accept: "application/json, text/html;q=0.9, */*;q=0.5", ...opt.headers },
      signal: AbortSignal.any(signals),
    });
  }

  async allowedByRobots(url: string): Promise<boolean> {
    const u = new URL(url);
    if (!this.robots.has(u.host)) {
      this.robots.set(u.host, (async () => {
        try {
          await this.slot(u.host);
          const r = await this.raw(`${u.protocol}//${u.host}/robots.txt`, {});
          if (r.status === 401 || r.status === 403) return [{ allow: false, len: 1, re: /^\// }]; // robots itself refused: treat as disallowed
          return r.ok ? parseRobots(await r.text(), this.userAgent) : [];
        } catch { return []; }
      })());
    }
    return robotsAllows(await this.robots.get(u.host)!, u.pathname + u.search);
  }

  async request(url: string, opt: RequestOptions = {}): Promise<Response> {
    const host = new URL(url).host;
    if (opt.robots !== false && !(await this.allowedByRobots(url))) throw new ProviderError(`robots.txt of ${host} does not allow ${new URL(url).pathname}`, "robots");
    let attempt = 0;
    for (;;) {
      if (opt.signal?.aborted) throw new ProviderError("cancelled", "timeout");
      await this.slot(host);
      let res: Response;
      try { res = await this.raw(url, opt); }
      catch (e) {
        const timeout = (e as Error).name === "TimeoutError" || (e as Error).name === "AbortError";
        if (attempt < this.retries && !opt.signal?.aborted && !timeout) { await this.sleep(1000 * 2 ** attempt++); continue; }
        throw new ProviderError(`${host}: ${timeout ? "timed out" : (e as Error).message}`, timeout ? "timeout" : "network");
      }
      if ((res.status === 429 || res.status >= 500) && attempt < this.retries) {
        const ra = Number(res.headers.get("retry-after"));
        await this.sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000 * 2 ** attempt, 30_000));
        attempt++;
        continue;
      }
      if (opt.redirect === "manual" && res.status >= 300 && res.status < 400) return res;
      if (!res.ok) throw new ProviderError(`${host} answered HTTP ${res.status}`, "http", res.status);
      return res;
    }
  }

  async json<T>(url: string, opt: RequestOptions = {}): Promise<T> {
    const res = await this.request(url, opt);
    try { return (await res.json()) as T; } catch { throw new ProviderError(`${new URL(url).host}: response was not JSON`, "parse"); }
  }

  async text(url: string, opt: RequestOptions = {}): Promise<{ text: string; contentType: string; finalUrl: string }> {
    const res = await this.request(url, opt);
    return { text: await res.text(), contentType: res.headers.get("content-type") ?? "", finalUrl: res.url || url };
  }
}
