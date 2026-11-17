import type { NextConfig } from "next";

/** Optional image CDN / Supabase Storage bucket that mirrors /media/products (see README → Images). */
const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE ? new URL(process.env.NEXT_PUBLIC_IMAGE_BASE) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // separate build output when needed (e.g. an auth-enabled test build next to the default one)
  distDir: process.env.VELOX_DIST_DIR || ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600],
    imageSizes: [64, 96, 160, 240, 320, 480],
    minimumCacheTTL: 60 * 60 * 24 * 30, // product photos are content-addressed by product id and change rarely
    remotePatterns: imageBase ? [{ protocol: imageBase.protocol.replace(":", "") as "https" | "http", hostname: imageBase.hostname, pathname: `${imageBase.pathname.replace(/\/$/, "")}/**` }] : [],
  },
  async headers() {
    return [
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
      { source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" }] },
    ];
  },
};

export default nextConfig;
