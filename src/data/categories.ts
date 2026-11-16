import type { Category } from "@/lib/types";

const sub = (names: string[]) =>
  names.map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name }));

/** Hierarchical category tree. Admins can append subcategories (stored in the catalog overlay). */
export const CATEGORIES: Category[] = [
  {
    id: "road",
    name: "Road",
    tagline: "Speed on tarmac",
    description: "Drop-bar bicycles built for efficiency on paved roads, from endurance riding to racing and the velodrome.",
    subcategories: sub(["Race", "Aero", "Climbing", "Endurance", "All-rounder", "Lightweight", "Time Trial", "Triathlon", "Track"]),
  },
  {
    id: "mtb",
    name: "MTB",
    tagline: "Built for dirt",
    description: "Mountain bikes for everything from cross-country racing to downhill, hardtails to long-travel full suspension.",
    subcategories: sub(["Cross Country", "Trail", "All Mountain", "Enduro", "Downhill", "Freeride", "Dirt Jump", "Fat Bike", "Hardtail", "Full Suspension"]),
  },
  {
    id: "gravel",
    name: "Gravel",
    tagline: "Any road, every road",
    description: "Drop-bar bikes with wide tyre clearance for mixed surfaces, racing, adventure and multi-day bikepacking.",
    subcategories: sub(["Performance Gravel", "Adventure Gravel", "Bikepacking", "Gravel Racing", "All-road"]),
  },
  {
    id: "urban",
    name: "Urban & Hybrid",
    tagline: "The everyday machine",
    description: "Practical bicycles for the city, commuting, fitness, touring and utility riding.",
    subcategories: sub(["City", "Commuter", "Hybrid", "Fitness", "Touring", "Trekking", "Utility"]),
  },
  {
    id: "electric",
    name: "Electric",
    tagline: "Assisted range",
    description: "Pedal-assist bicycles across road, mountain, gravel, urban, folding and cargo formats.",
    subcategories: sub(["E-Road", "E-MTB", "E-Gravel", "E-Urban", "E-Folding", "E-Cargo", "Electric Hybrid"]),
  },
  {
    id: "folding",
    name: "Folding",
    tagline: "Fold. Carry. Ride.",
    description: "Compact bicycles that fold for transit, apartments and travel.",
    subcategories: sub(["Compact Folding", "Performance Folding", "Urban Folding", "Electric Folding"]),
  },
  {
    id: "bmx",
    name: "BMX",
    tagline: "20 inches of control",
    description: "Small-wheeled bikes for freestyle, racing, street, park and dirt.",
    subcategories: sub(["Freestyle", "Racing", "Street", "Park", "Dirt"]),
  },
  {
    id: "other",
    name: "Specialty",
    tagline: "Every other way to ride",
    description: "Fixed gear, cargo, tandem, kids, adaptive, cruisers, cyclocross and more.",
    subcategories: sub([
      "Fixed Gear",
      "Single Speed",
      "Cargo",
      "Tandem",
      "Recumbent",
      "Kids",
      "Balance Bikes",
      "Adaptive Bikes",
      "Fat Tire",
      "Beach Cruisers",
      "Touring",
      "Cyclocross",
    ]),
  },
];
