/** Small in-memory TTL + LRU cache (per server instance). Persistent data lives in the database. */
export class TtlCache<V> {
  private readonly map = new Map<string, { at: number; value: V }>();
  constructor(private readonly max = 500) {}
  get(key: string, ttlMs: number, now = Date.now()): { value: V; ageMs: number } | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (now - e.at > ttlMs) { this.map.delete(key); return null; }
    this.map.delete(key); this.map.set(key, e); // refresh LRU position
    return { value: e.value, ageMs: now - e.at };
  }
  set(key: string, value: V, now = Date.now()) {
    this.map.delete(key);
    this.map.set(key, { at: now, value });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
  get size() { return this.map.size; }
}
