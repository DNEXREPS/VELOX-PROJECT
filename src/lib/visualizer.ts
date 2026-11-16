import type { BikeProfile } from "./upgrade";
import type { Component, ComponentType } from "./types";

export type Concept = "original" | "budget" | "balanced" | "performance" | "custom";
export type Scene = "studio-dark" | "road" | "gravel" | "urban";

const SCENES: Record<Scene, string> = {
  "studio-dark": "professional product photograph in a dark studio, dramatic rim lighting, deep charcoal background, soft floor reflection",
  road: "professional product photograph on a quiet mountain road at golden hour, shallow depth of field",
  gravel: "professional product photograph on a gravel road in soft morning light",
  urban: "professional product photograph against a minimal concrete wall in a modern city, overcast light",
};

export interface ConceptInput {
  profile: BikeProfile;
  frameMaterial: string | null;
  parts: Partial<Record<ComponentType, Component>>;
  frameColor: string;
  scene: Scene;
  concept: Concept;
  hasReferencePhoto: boolean;
}

function describePart(slot: ComponentType, c: Component): string {
  const w = c.wheel;
  if (slot === "wheelset") return `${w?.rimMaterial ?? c.material ?? ""} wheels${w?.rimDepthMm ? ` with ${w.rimDepthMm} mm deep rims` : ""} (no readable logos)`.replace(/\s+/g, " ").trim();
  if (slot === "tires") return `tyres sized ${String(c.specs.Size ?? "").replace(" x ", " × ")}`;
  if (slot === "handlebar") return `${String(c.specs.Type ?? "handlebar").toLowerCase()} handlebar in ${c.material?.toLowerCase() ?? "a matching finish"}`;
  if (slot === "pedals") return `${String(c.specs.System ?? "").toLowerCase() || "performance"} pedals`;
  if (slot === "saddle") return `slim ${c.discipline.includes("mtb") ? "trail" : c.discipline.includes("urban") ? "comfort" : "road racing"} saddle${c.specs.Rails ? ` with ${String(c.specs.Rails).toLowerCase()} rails` : ""}`;
  if (slot === "seatpost") return /dropper/i.test(c.name) ? "dropper seatpost" : `${c.material?.toLowerCase() ?? ""} seatpost`.trim();
  if (slot === "groupset") return `${c.compat.electronic ? "electronic" : "mechanical"} ${c.compat.chainrings ?? 2}x${c.compat.speeds ?? ""} drivetrain with ${c.compat.brakeType === "hydraulic-disc" ? "hydraulic disc brakes" : "rim brakes"}`;
  return `${c.material ? `${c.material.toLowerCase()} ` : ""}${slot.replace("-", " ")} in the style of a ${c.tier}-level part`;
}

/**
 * Builds a geometry-preserving image brief. Brand names are deliberately excluded from the
 * rendering instructions so the model does not fabricate manufacturer logos or present the
 * concept as a genuine product.
 */
export function buildConceptPrompt(i: ConceptInput): { prompt: string; negativePrompt: string; changes: string[] } {
  const changes = (Object.entries(i.parts) as Array<[ComponentType, Component]>).map(([slot, c]) => `${slot}: ${describePart(slot, c)}`);
  const category = i.profile.category === "mtb" ? "mountain bike" : i.profile.category === "urban" ? "city bicycle" : `${i.profile.category} bicycle`;
  const keep = i.hasReferencePhoto
    ? "Use the reference photo as the base: keep the exact frame silhouette, tube shapes, geometry, wheelbase, fork shape, proportions and camera angle. Modify only the listed components."
    : `Depict a generic, unbranded ${i.frameMaterial ?? ""} ${category} with conventional geometry for its category.`;
  const prompt = [
    `Photorealistic ${SCENES[i.scene]}, full side profile of a ${category}, the whole bicycle in frame.`,
    keep,
    changes.length ? `Component changes: ${changes.join("; ")}.` : "No component changes — render the original configuration.",
    i.frameColor ? `Frame colour concept: ${i.frameColor}.` : "Keep the original frame colour.",
    "Accurate mechanical detail: correct chain line, spokes, cables and brake hardware; realistic materials (carbon weave, anodised aluminium, rubber).",
    "No text, no brand logos, no watermarks, no people.",
  ].join(" ");
  const negativePrompt = "cartoon, illustration, wireframe, sketch, line drawing, extra wheels, bent frame, distorted geometry, melted parts, text, logos, watermark, people";
  return { prompt, negativePrompt, changes };
}
