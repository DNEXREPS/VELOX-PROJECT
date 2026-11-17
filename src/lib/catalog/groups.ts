import type { ComponentType } from "@/lib/types";

/** Component explorer groups (shared by the page and the /api/catalog/components route). */
export const COMPONENT_GROUPS: Array<{ id: string; label: string; types: ComponentType[] }> = [
  { id: "all", label: "All", types: [] },
  { id: "groupsets", label: "Groupsets", types: ["groupset"] },
  { id: "drivetrain", label: "Drivetrain parts", types: ["shifters", "front-derailleur", "rear-derailleur", "crankset", "cassette", "chain"] },
  { id: "wheels", label: "Wheels & rims", types: ["wheelset", "rim"] },
  { id: "tires", label: "Tyres", types: ["tires"] },
  { id: "brakes", label: "Brakes", types: ["brakes"] },
  { id: "frames", label: "Frames & forks", types: ["frame", "fork"] },
  { id: "cockpit", label: "Cockpit & contact", types: ["handlebar", "stem", "saddle", "seatpost", "pedals"] },
  { id: "hubs", label: "Hubs & bearings", types: ["hub", "bearing"] },
  { id: "accessories", label: "Accessories", types: ["accessory"] },
];
