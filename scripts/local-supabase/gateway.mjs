#!/usr/bin/env node
/**
 * Local Supabase-compatible gateway for development and tests (NOT for production).
 *  - http://localhost:54321/auth/v1/*  → GoTrue (Supabase Auth)   on :9999
 *  - http://localhost:54321/rest/v1/*  → PostgREST                on :3001
 *  - SMTP sink on :1025 capturing GoTrue's emails (verification, password reset)
 *  - http://localhost:54321/__mail     → JSON list of captured emails (tests read links from here)
 * Mirrors what Supabase's API gateway does so @supabase/supabase-js works unchanged.
 */
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const ROUTES = [["/auth/v1", Number(process.env.GOTRUE_PORT ?? 9999)], ["/rest/v1", Number(process.env.POSTGREST_PORT ?? 3001)]];
const mail = [];

function cors(res, origin) {
  res.setHeader("access-control-allow-origin", origin || "*");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "authorization, x-client-info, apikey, content-type, prefer, range, accept-profile, content-profile, x-supabase-api-version");
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("access-control-expose-headers", "content-range, x-supabase-api-version");
}

http.createServer((req, res) => {
  cors(res, req.headers.origin);
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.url.startsWith("/__mail")) {
    if (req.method === "DELETE") mail.length = 0;
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(mail));
  }
  const route = ROUTES.find(([p]) => req.url.startsWith(p + "/") || req.url === p);
  if (!route) { res.writeHead(404); return res.end("not found"); }
  const [prefix, port] = route;
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  const up = http.request({ host: "127.0.0.1", port, method: req.method, path: req.url.slice(prefix.length) || "/", headers }, (r) => {
    const h = { ...r.headers };
    for (const k of Object.keys(h)) if (k.startsWith("access-control-")) delete h[k];
    res.writeHead(r.statusCode, h); r.pipe(res);
  });
  up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
}).listen(PORT, () => console.log(`gateway on :${PORT}`));

/* ------------------------------ SMTP sink ------------------------------ */
net.createServer((sock) => {
  let data = false, buf = "", msg = { from: "", to: [], raw: "" };
  sock.write("220 velox-mail ESMTP\r\n");
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (data) {
        if (line === ".") {
          data = false;
          const raw = msg.raw;
          const subject = (raw.match(/^Subject: (.*)$/mi) ?? [])[1] ?? "";
          const body = raw.replace(/=\r?\n/g, "").replace(/=3D/g, "=").replace(/&amp;/g, "&");
          const links = [...new Set(body.match(/https?:\/\/[^\s"'<>]+/g) ?? [])];
          mail.push({ from: msg.from, to: msg.to, subject, links, receivedAt: new Date().toISOString() });
          msg = { from: "", to: [], raw: "" };
          sock.write("250 OK queued\r\n");
        } else msg.raw += line.replace(/^\.\./, ".") + "\n";
        continue;
      }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") sock.write("250-velox-mail\r\n250-8BITMIME\r\n250 AUTH PLAIN LOGIN\r\n");
      else if (cmd === "AUTH") sock.write("235 2.7.0 Authentication successful\r\n");
      else if (cmd === "MAIL") { msg.from = line.slice(10).replace(/[<>]/g, ""); sock.write("250 OK\r\n"); }
      else if (cmd === "RCPT") { msg.to.push(line.slice(8).replace(/[<>]/g, "")); sock.write("250 OK\r\n"); }
      else if (cmd === "DATA") { data = true; sock.write("354 End data with <CR><LF>.<CR><LF>\r\n"); }
      else if (cmd === "QUIT") { sock.write("221 Bye\r\n"); sock.end(); }
      else sock.write("250 OK\r\n");
    }
  });
  sock.on("error", () => {});
}).listen(Number(process.env.SMTP_PORT ?? 1025), () => console.log("smtp sink on :1025"));
