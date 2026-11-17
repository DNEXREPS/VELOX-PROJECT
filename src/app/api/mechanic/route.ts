import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { COMPONENTS } from "@/data/components";
import { diagnose } from "@/lib/mechanic/engine";
import { getLanguageProvider } from "@/lib/ai/registry";
import type { ImageInput } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  description: z.string().max(4000),
  answers: z.record(z.string(), z.string()).default({}),
  systems: z.array(z.string()).default([]),
  bike: z.object({ label: z.string(), compat: z.record(z.string(), z.unknown()), groupset: z.string().nullable().optional(), brakes: z.string().nullable().optional() }).nullable().default(null),
  images: z.array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), base64: z.string().max(7_000_000) })).max(6).default([]),
});

/**
 * POST /api/mechanic
 * Always returns the local engine result. When an AI provider is configured, adds `ai` with the
 * model's structured analysis; failures degrade to the local result with an explanatory `aiError`.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "mechanic", 20);
  if (limited) return limited;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request", detail: (e as Error).message }, { status: 400 });
  }

  const local = diagnose({ text: body.description, answers: body.answers, systems: body.systems as never, bike: body.bike as never, imageCount: body.images.length });
  const provider = getLanguageProvider();
  if (!provider) {
    return NextResponse.json({ local, ai: null, aiConnected: false, aiError: null });
  }

  const catalogContext = COMPONENTS.filter((c) => local.componentTypes.includes(c.type))
    .slice(0, 25)
    .map((c) => `${c.manufacturer} ${c.name} [${c.type}] status=${c.provenance.status}${c.bearing ? ` bearing ${c.bearing.innerMm}x${c.bearing.outerMm}x${c.bearing.widthMm}` : ""}`)
    .join("\n");
  const bikeContext = body.bike ? `${body.bike.label}; groupset ${body.bike.groupset ?? "unknown"}; brakes ${body.bike.brakes ?? "unknown"}; attributes ${JSON.stringify(body.bike.compat)}` : null;

  try {
    const ai = await provider.diagnose({ description: body.description, answers: body.answers, bikeContext, images: body.images as ImageInput[], local, catalogContext });
    return NextResponse.json({ local, ai, aiConnected: true, aiProvider: `${provider.label} (${provider.model})`, aiError: null });
  } catch (e) {
    const msg = e instanceof Anthropic.RateLimitError ? "The AI provider is rate-limited — showing the local analysis." : e instanceof Anthropic.AuthenticationError ? "The AI provider rejected the server's credentials." : e instanceof Anthropic.APIError ? `AI provider error (${e.status}).` : (e as Error).message;
    return NextResponse.json({ local, ai: null, aiConnected: true, aiError: msg });
  }
}
