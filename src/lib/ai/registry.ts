import "server-only";
import { anthropicConfigured, createAnthropicProvider } from "./anthropic";
import type { AIStatus, ImageGenerationProvider, ImageGenerationRequest, ImageGenerationResult, LanguageVisionProvider } from "./types";

/**
 * Provider registry. Each capability resolves independently from environment variables, so
 * language, vision and image generation can come from different providers.
 *
 *   ANTHROPIC_API_KEY            → language + vision (AI Mechanic)
 *   VELOX_AI_MODEL               → optional model override (default claude-opus-5-5)
 *   VELOX_IMAGE_API_URL          → image generation endpoint (any provider / gateway, see below)
 *   VELOX_IMAGE_API_KEY          → bearer token for that endpoint
 *
 * The image endpoint contract is deliberately generic:
 *   POST { prompt, negative_prompt, n, reference_image?: { media_type, data(base64) } }
 *   →    { images: [ { b64: string, media_type?: string } | { url: string } ] }
 * A thin server-side gateway can map this to any image model. Without it, VELOX never shows a
 * placeholder or illustration in place of a generated image.
 */

export function getLanguageProvider(): LanguageVisionProvider | null {
  return anthropicConfigured() ? createAnthropicProvider() : null;
}

function createHttpImageProvider(): ImageGenerationProvider | null {
  const url = process.env.VELOX_IMAGE_API_URL;
  if (!url) return null;
  return {
    id: "http-image",
    label: `Image endpoint (${new URL(url).host})`,
    async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(process.env.VELOX_IMAGE_API_KEY ? { authorization: `Bearer ${process.env.VELOX_IMAGE_API_KEY}` } : {}) },
        body: JSON.stringify({ prompt: req.prompt, negative_prompt: req.negativePrompt, n: req.variants, reference_image: req.referenceImage ? { media_type: req.referenceImage.mediaType, data: req.referenceImage.base64 } : undefined }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`Image provider responded ${res.status}`);
      const data = (await res.json()) as { images?: Array<{ b64?: string; media_type?: string; url?: string }> };
      const images = (data.images ?? []).map((i) => ({ dataUrl: i.b64 ? `data:${i.media_type ?? "image/png"};base64,${i.b64}` : String(i.url) })).filter((i) => i.dataUrl && i.dataUrl !== "undefined");
      if (!images.length) throw new Error("Image provider returned no images");
      return { images, provider: this.label };
    },
  };
}

export function getImageProvider(): ImageGenerationProvider | null {
  try {
    return createHttpImageProvider();
  } catch {
    return null;
  }
}

export function aiStatus(): AIStatus {
  const lang = getLanguageProvider();
  const img = getImageProvider();
  return {
    language: lang ? { connected: true, provider: lang.label, model: lang.model, reason: null } : { connected: false, provider: null, model: null, reason: "ANTHROPIC_API_KEY is not set on the server." },
    vision: lang ? { connected: true, provider: lang.label, reason: null } : { connected: false, provider: null, reason: "Requires the language/vision provider (ANTHROPIC_API_KEY)." },
    imageGeneration: img ? { connected: true, provider: img.label, reason: null } : { connected: false, provider: null, reason: "VELOX_IMAGE_API_URL is not set on the server." },
    research: { connected: false, reason: "Automated product research is not enabled in this build; official sources are listed in the research registry awaiting integration." },
  };
}
