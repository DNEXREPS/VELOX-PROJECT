// Loads VELOX TypeScript modules (with the "@/…" alias) from plain Node scripts via Vite's SSR loader.
import path from "node:path";
import { createServer } from "vite";

export async function withModules(fn) {
  const root = path.resolve(import.meta.dirname, "../..");
  const server = await createServer({
    root, configFile: false, logLevel: "error", appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    resolve: { alias: { "@": path.join(root, "src") } },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    return await fn((p) => server.ssrLoadModule(p));
  } finally {
    await server.close();
  }
}
