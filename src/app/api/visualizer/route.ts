import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { z } from "zod";
import { getImageProvider } from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

const Body = z.object({
  prompt: z.string().min(10).max(6000),
  negativePrompt: z.string().max(2000).default(""),
  variants: z.number().int().min(1).max(4).default(1),
  referenceImage: z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), base64: z.string().max(7_000_000) }).nullable().default(null),
});

/** POST /api/visualizer — generates concept images when an image provider is configured; 503 otherwise. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "visualizer", 10);
  if (limited) return limited;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request", detail: (e as Error).message }, { status: 400 });
  }
  const provider = getImageProvider();
  if (!provider) {
    return NextResponse.json({ error: "not-configured", message: "No image-generation provider is configured on the server (VELOX_IMAGE_API_URL). No image was generated." }, { status: 503 });
  }
  try {
    const result = await provider.generate(body);
    return NextResponse.json({ ...result, label: "AI concept visualisation — not an engineering representation or a real product photo." });
  } catch (e) {
    return NextResponse.json({ error: "generation-failed", message: (e as Error).message }, { status: 502 });
  }
}
