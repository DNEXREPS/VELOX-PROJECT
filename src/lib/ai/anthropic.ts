import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { LanguageVisionProvider, MechanicAIResult, MechanicRequest } from "./types";

/** Anthropic language + vision provider for AI Mechanic. Server-only; key never reaches the browser. */

const MechanicSchema = z.object({
  summary: z.string(),
  likelyCauses: z.array(z.object({ title: z.string(), system: z.string(), reasoning: z.string(), confidence: z.enum(["likely", "possible"]) })),
  followUpQuestions: z.array(z.string()),
  inspectionSteps: z.array(z.string()),
  componentsToCheck: z.array(z.string()),
  bearingNotes: z.string().nullable(),
  imageObservations: z.array(z.string()),
  unknowns: z.array(z.string()),
  safety: z.object({ level: z.enum(["stop", "caution", "none"]), message: z.string().nullable() }),
});

const SYSTEM_PROMPT = `You are VELOX AI Mechanic, a bicycle troubleshooting assistant inside a cycling platform.
You cannot see or touch the bike, so you never diagnose it: you rank hypotheses for the rider to inspect.

How to answer:
- Separate what the rider confirmed, what is likely, what is only possible, and what is unknown. Mark a cause "likely" only when the described symptoms and answers point to it; otherwise "possible".
- Ground your answer in the local engine's analysis and the catalogue data you are given. You may disagree with the engine when the evidence supports it; say why in the reasoning.
- Never state exact part numbers, bearing sizes, torque values or compatibility as fact unless they appear in the provided catalogue context. For bearings, ask for the hub/BB/headset model, the marking on the bearing seal, or measured inner diameter × outer diameter × width. Never identify an exact bearing from a photo alone.
- Photos: describe only what is visible (e.g. "oil residue on the lower stanchion"), and say when a photo is not conclusive.
- Safety: if the problem could affect braking, steering, the fork or frame integrity, set safety.level to "stop" and tell the rider to stop riding until a qualified mechanic inspects it. Use "caution" for lesser concerns.
- Follow-up questions should be specific checks the rider can do at home. Keep inspection steps practical and ordered from simplest to hardest.
- Write in clear, plain English; be concise.`;

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function createAnthropicProvider(): LanguageVisionProvider {
  const model = process.env.VELOX_AI_MODEL || "claude-opus-5-5";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.VELOX_ANTHROPIC_BASE_URL || undefined });

  return {
    id: "anthropic",
    label: "Anthropic Claude",
    model,
    async diagnose(req: MechanicRequest): Promise<MechanicAIResult> {
      const content: Anthropic.Beta.BetaContentBlockParam[] = [
        ...req.images.slice(0, 6).map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 } })),
        {
          type: "text",
          text: [
            `Rider's description:\n${req.description || "(none)"}`,
            `Rider's answers to follow-up questions:\n${Object.entries(req.answers).map(([q, a]) => `- ${q}: ${a}`).join("\n") || "(none)"}`,
            `Bike context (catalogue data, not verified on the bike):\n${req.bikeContext ?? "Not provided"}`,
            `Local engine analysis (rule-based, for grounding):\n${JSON.stringify({ likely: req.local.likely.map((c) => ({ title: c.title, system: c.system, evidence: c.evidence })), possible: req.local.possible.map((c) => c.title), unknown: req.local.unknown, safety: req.local.safety }, null, 1)}`,
            `Relevant catalogue data:\n${req.catalogContext || "(none)"}`,
            `${req.images.length} photo(s) attached.`,
          ].join("\n\n"),
        },
      ];

      const response = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium", format: betaZodOutputFormat(MechanicSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });

      if (response.stop_reason === "refusal") throw new Error("The AI provider declined this request.");
      if (!response.parsed_output) throw new Error("The AI provider returned an unreadable response.");
      return response.parsed_output;
    },
  };
}
