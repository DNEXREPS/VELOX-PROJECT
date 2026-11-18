import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** True only if every address the host resolves to is a public unicast address (SSRF guard). */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
}

export async function isPublicHost(u: URL): Promise<boolean> {
  if (!/^https?:$/.test(u.protocol)) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return !isPrivateAddress(host);
  try { const addrs = await lookup(host, { all: true }); return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address)); }
  catch { return true; } // unresolvable here (e.g. behind an egress proxy): the fetch itself will fail or be refused by the proxy
}
