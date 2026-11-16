import type { Diagnosis } from "../mechanic/engine";

/** Provider-independent AI interfaces. Implementations live server-side only. */

export interface ImageInput {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  base64: string;
}

export interface MechanicRequest {
  description: string;
  answers: Record<string, string>;
  bikeContext: string | null;
  images: ImageInput[];
  /** the local engine's result, used to ground the model */
  local: Diagnosis;
  catalogContext: string;
}

export interface MechanicAIResult {
  summary: string;
  likelyCauses: Array<{ title: string; system: string; reasoning: string; confidence: "likely" | "possible" }>;
  followUpQuestions: string[];
  inspectionSteps: string[];
  componentsToCheck: string[];
  bearingNotes: string | null;
  imageObservations: string[];
  unknowns: string[];
  safety: { level: "stop" | "caution" | "none"; message: string | null };
}

export interface LanguageVisionProvider {
  id: string;
  label: string;
  model: string;
  diagnose(req: MechanicRequest): Promise<MechanicAIResult>;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt: string;
  referenceImage: ImageInput | null;
  variants: number;
}

export interface ImageGenerationResult {
  images: Array<{ dataUrl: string }>;
  provider: string;
}

export interface ImageGenerationProvider {
  id: string;
  label: string;
  generate(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export interface AIStatus {
  language: { connected: boolean; provider: string | null; model: string | null; reason: string | null };
  vision: { connected: boolean; provider: string | null; reason: string | null };
  imageGeneration: { connected: boolean; provider: string | null; reason: string | null };
  research: { connected: boolean; reason: string };
}
