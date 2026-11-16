import type { ComponentType } from "../types";

/**
 * Diagnostic knowledge base for VELOX AI Mechanic.
 * General bicycle-mechanics knowledge, written as hypotheses to inspect — never as a diagnosis.
 */

export type System =
  | "bottom-bracket" | "headset" | "front-hub" | "rear-hub" | "wheel-bearings" | "freehub" | "crankset" | "chain" | "cassette"
  | "derailleurs" | "brakes" | "rotors" | "suspension" | "fork" | "frame" | "seatpost" | "pedals" | "cockpit" | "tires";

export const SYSTEM_LABEL: Record<System, string> = {
  "bottom-bracket": "Bottom bracket", headset: "Headset", "front-hub": "Front hub", "rear-hub": "Rear hub", "wheel-bearings": "Wheel bearings",
  freehub: "Freehub", crankset: "Crankset", chain: "Chain", cassette: "Cassette", derailleurs: "Derailleurs", brakes: "Brakes", rotors: "Rotors",
  suspension: "Suspension", fork: "Fork", frame: "Frame", seatpost: "Seatpost", pedals: "Pedals", cockpit: "Cockpit", tires: "Tyres & tubes",
};

/** Systems where a fault can affect braking, steering or structural integrity. */
export const SAFETY_SYSTEMS: System[] = ["brakes", "rotors", "headset", "fork", "frame", "cockpit"];

/** Keyword → system hints (English + common Indonesian terms). */
export const SYSTEM_KEYWORDS: Record<System, string[]> = {
  "bottom-bracket": ["bottom bracket", "bb", "bracket", "pedaling", "pedalling", "creak when pedal", "kayuh", "bb30", "pf30", "bsa", "t47", "bb86", "bb92", "press fit", "pressfit"],
  headset: ["headset", "steering", "turning", "handlebar turn", "head tube", "stem play", "komstir", "fork play", "knocking front", "clunk when braking front"],
  "front-hub": ["front hub", "front wheel", "roda depan"],
  "rear-hub": ["rear hub", "rear wheel", "roda belakang", "back wheel"],
  "wheel-bearings": ["hub", "bearing", "laher", "wheel play", "wobble", "wheel wobble", "grinding wheel", "rough wheel"],
  freehub: ["freehub", "coasting", "freewheel", "pawls", "ratchet", "pedal slips", "no engagement", "freehub body", "hub skips"],
  crankset: ["crank", "crankset", "chainring", "crank arm", "loose crank", "crank wobble", "gir depan"],
  chain: ["chain", "rantai", "chain drop", "chain suck", "stiff link"],
  cassette: ["cassette", "sprocket", "cog", "gir belakang", "sproket"],
  derailleurs: ["derailleur", "shifting", "shift", "skips gears", "skipping", "ghost shifting", "indexing", "gear", "perpindahan gigi", "rd", "fd", "hanger"],
  brakes: ["brake", "brakes", "rem", "lever", "spongy", "squeal", "squeak", "pads", "kampas", "stopping"],
  rotors: ["rotor", "disc rub", "rubs", "rubbing", "cakram", "warped", "disc brake noise"],
  suspension: ["suspension", "shock", "rear shock", "sag", "rebound", "compression", "bottoming", "inconsistent suspension", "linkage", "pivot"],
  fork: ["fork", "stanchion", "garpu", "suspension fork", "fork seal", "oil on stanchion"],
  frame: ["frame", "crack", "rangka", "dent", "frame noise", "carbon damage", "dropout"],
  seatpost: ["seatpost", "seat post", "saddle", "slipping seat", "sadel", "dropper"],
  pedals: ["pedal", "pedals", "cleat", "clipless", "spindle"],
  cockpit: ["handlebar", "stem", "bar", "stang", "cockpit", "bar tape", "loose bars"],
  tires: ["tyre", "tire", "tube", "puncture", "flat", "ban", "bocor", "pressure", "tubeless", "sealant", "burping"],
};

export type Symptom = "click" | "creak" | "grind" | "squeal" | "rub" | "play" | "rough" | "skip" | "spongy" | "inconsistent" | "slip" | "flat" | "knock";
export const SYMPTOM_KEYWORDS: Record<Symptom, string[]> = {
  click: ["click", "clicking", "tick", "ticking", "bunyi klik", "kletek"],
  creak: ["creak", "creaking", "creaky", "krek", "squeak under load"],
  grind: ["grind", "grinding", "gritty", "crunch", "kasar"],
  squeal: ["squeal", "squeak", "squealing", "howl", "honk", "mencicit", "berdecit"],
  rub: ["rub", "rubbing", "scrape", "scraping", "gesek"],
  play: ["play", "loose", "wobble", "wobbly", "goyang", "longgar", "knock", "clunk"],
  rough: ["rough", "notchy", "indexed steering", "stiff", "tight"],
  skip: ["skip", "skips", "skipping", "jumps", "ghost", "slips gear", "loncat"],
  spongy: ["spongy", "soft lever", "lever to bar", "mushy", "blong"],
  inconsistent: ["inconsistent", "varies", "sometimes", "intermittent", "different every"],
  slip: ["slip", "slipping", "sinks", "drops", "turun sendiri", "freewheel spins"],
  flat: ["flat", "puncture", "losing air", "kempes", "bocor"],
  knock: ["knock", "clunk", "thunk"],
};

export interface Question {
  id: string;
  text: string;
  options: string[];
  systems: System[];
}

export const QUESTIONS: Question[] = [
  { id: "noise-when", text: "When does the noise or problem happen?", options: ["Only when pedalling hard / out of the saddle", "When pedalling at any effort", "When coasting", "When braking", "When turning the handlebar", "Over bumps", "All the time"], systems: ["bottom-bracket", "crankset", "pedals", "freehub", "rear-hub", "front-hub", "headset", "brakes", "suspension", "seatpost", "cockpit", "frame"] },
  { id: "seated", text: "Does the noise stop when you pedal seated / without pulling on the bars?", options: ["Yes, it stops", "No, it continues", "Not sure"], systems: ["bottom-bracket", "seatpost", "cockpit", "pedals"] },
  { id: "wheel-play", text: "With the wheel in the bike, grab the rim and push it side to side. Is there play (a knock)?", options: ["Yes, noticeable play", "No play", "Haven't checked"], systems: ["front-hub", "rear-hub", "wheel-bearings", "freehub"] },
  { id: "wheel-spin", text: "Spin the wheel by hand off the ground. How does it feel / sound?", options: ["Smooth and quiet", "Gritty or rough", "Stops quickly", "Rubs at one point"], systems: ["front-hub", "rear-hub", "wheel-bearings", "rotors", "brakes"] },
  { id: "headset-brake-test", text: "Hold the front brake and rock the bike forward and back. Do you feel a clunk at the head tube?", options: ["Yes, a clunk", "No clunk", "Haven't checked"], systems: ["headset", "fork"] },
  { id: "steering-feel", text: "With the front wheel lifted, turn the bars slowly. Do they stop in a 'notch' at the straight-ahead position or feel rough?", options: ["Notchy / indexed", "Rough or gritty", "Smooth", "Haven't checked"], systems: ["headset"] },
  { id: "crank-play", text: "Hold a crank arm and push it in and out (toward and away from the frame). Any movement?", options: ["Yes, it moves", "No movement", "Haven't checked"], systems: ["bottom-bracket", "crankset"] },
  { id: "skip-gears", text: "Does the chain skip in specific cogs or all of them?", options: ["Mostly the smallest cogs (most-used)", "Across most cogs", "Only when shifting", "Only under hard effort"], systems: ["chain", "cassette", "derailleurs", "freehub"] },
  { id: "chain-wear", text: "Have you measured chain wear with a checker, and roughly how far has the chain been ridden?", options: ["Checker shows worn (≥0.5–0.75%)", "Checker shows OK", "Not measured — over ~3,000 km", "Not measured — under ~3,000 km"], systems: ["chain", "cassette"] },
  { id: "recent-work", text: "Was anything changed or serviced recently (wheel swap, new cable, crash, transport)?", options: ["Wheel removed / swapped", "New cable or housing", "Crash or the bike fell on its drive side", "Nothing recent"], systems: ["derailleurs", "rotors", "brakes", "frame"] },
  { id: "brake-lever", text: "How does the brake lever feel?", options: ["Spongy / pulls toward the bar", "Firm but weak stopping", "Firm and normal", "Noise only, feel is normal"], systems: ["brakes"] },
  { id: "brake-contamination", text: "Could the pads or rotor have been contaminated (oil, chain lube, cleaning spray)?", options: ["Yes / possibly", "No"], systems: ["brakes", "rotors"] },
  { id: "suspension-symptom", text: "What does the suspension do?", options: ["Sinks / loses air over time", "Feels harsh or sticky", "Bounces back too fast", "Knocks on top-out", "Oil on the stanchions"], systems: ["suspension", "fork"] },
  { id: "measurements", text: "Do you have bearing markings or measurements (inner Ø, outer Ø, width in mm)?", options: ["Yes — I'll enter them in Bearing ID", "I can read markings on the seal", "No"], systems: ["bottom-bracket", "headset", "front-hub", "rear-hub", "wheel-bearings", "freehub", "suspension"] },
  { id: "frame-inspection", text: "Have you inspected the frame and fork closely (around welds, dropouts, head tube, BB) for cracks or paint lines?", options: ["Found a crack / suspicious line", "Looked — nothing found", "Haven't checked"], systems: ["frame", "fork"] },
];

export type Complexity = "Easy (home)" | "Moderate (basic tools)" | "Advanced (special tools)" | "Workshop recommended";

export interface Cause {
  id: string;
  system: System;
  title: string;
  explanation: string;
  base: number; // prior 0..1
  symptoms: Partial<Record<Symptom, number>>;
  answers?: Array<{ q: string; a: string; delta: number }>;
  inspection: string[];
  components: ComponentType[];
  complexity: Complexity;
  safety?: "stop" | "caution";
  bearing?: boolean;
}

export const CAUSES: Cause[] = [
  // Bottom bracket & crank
  { id: "bb-worn-bearings", system: "bottom-bracket", title: "Worn or contaminated bottom-bracket bearings", explanation: "BB bearings wear and let water in, causing creaks, clicks or a gritty feel when pedalling.", base: 0.35, symptoms: { creak: 0.3, click: 0.25, grind: 0.3, rough: 0.2 }, answers: [{ q: "noise-when", a: "Only when pedalling hard / out of the saddle", delta: 0.15 }, { q: "seated", a: "No, it continues", delta: 0.1 }, { q: "crank-play", a: "Yes, it moves", delta: 0.2 }], inspection: ["Remove the chain from the chainring and spin the cranks: roughness points to the BB bearings.", "Check crank play by pushing the crank arm in and out.", "Identify your BB standard (BSA, T47, BB86, BB92, PF30, BB30…) from the frame or manufacturer docs before buying parts."], components: ["crankset"], complexity: "Advanced (special tools)", bearing: true },
  { id: "bb-pressfit-creak", system: "bottom-bracket", title: "Press-fit BB cups moving in the shell", explanation: "Press-fit standards (BB86/BB92/PF30) can creak if the shell tolerance or cup fit is imperfect.", base: 0.2, symptoms: { creak: 0.35, click: 0.2 }, answers: [{ q: "noise-when", a: "Only when pedalling hard / out of the saddle", delta: 0.1 }], inspection: ["Confirm whether the frame uses a press-fit standard.", "A workshop can remove, clean and refit the cups with retaining compound, or fit a thread-together press-fit BB."], components: ["crankset"], complexity: "Workshop recommended", bearing: true },
  { id: "crank-loose", system: "crankset", title: "Loose crank arm or crank preload", explanation: "A loose non-drive arm or incorrect preload causes knocking and clicking every pedal stroke, and can damage the spindle interface.", base: 0.2, symptoms: { click: 0.25, play: 0.35, knock: 0.25 }, answers: [{ q: "crank-play", a: "Yes, it moves", delta: 0.25 }], inspection: ["Check crank-arm pinch bolts / fixing bolt torque against the manufacturer's spec.", "Check preload cap adjustment (Shimano Hollowtech II) — finger-tight preload, then torque pinch bolts."], components: ["crankset"], complexity: "Moderate (basic tools)", safety: "caution" },
  { id: "chainring-bolts", system: "crankset", title: "Dry or loose chainring bolts", explanation: "Chainring bolts that are loose or dry can tick once per revolution under load.", base: 0.12, symptoms: { click: 0.25, creak: 0.15 }, inspection: ["Check chainring bolt torque.", "Remove, grease threads and refit to spec."], components: ["crankset"], complexity: "Moderate (basic tools)" },
  { id: "pedal-bearings", system: "pedals", title: "Pedal spindle bearings or loose pedal", explanation: "Pedals and cleats are a very common source of 'BB' noises.", base: 0.2, symptoms: { click: 0.25, creak: 0.2, play: 0.2 }, answers: [{ q: "seated", a: "Yes, it stops", delta: -0.05 }], inspection: ["Swap pedals with another pair to see if the noise follows.", "Check pedal threads are tight; grease threads.", "Check cleat bolts and cleat wear."], components: ["pedals"], complexity: "Easy (home)", bearing: true },
  { id: "seatpost-saddle-creak", system: "seatpost", title: "Seatpost or saddle rail creak", explanation: "Creaks that seem to come from the BB often come from the seatpost, clamp or saddle rails.", base: 0.15, symptoms: { creak: 0.3, click: 0.1 }, answers: [{ q: "seated", a: "No, it continues", delta: 0.05 }, { q: "noise-when", a: "Over bumps", delta: 0.15 }], inspection: ["Pedal out of the saddle: if the noise stops, suspect the seatpost/saddle.", "Clean and re-grease (or carbon paste) the post and re-torque the clamp and rail bolts."], components: ["seatpost", "saddle"], complexity: "Easy (home)" },
  // Wheels, hubs & bearings
  { id: "hub-bearing-wear", system: "wheel-bearings", title: "Worn or contaminated hub bearings", explanation: "Grinding, roughness or play at the rim usually means worn hub bearings or incorrect preload.", base: 0.35, symptoms: { grind: 0.35, rough: 0.3, play: 0.3 }, answers: [{ q: "wheel-play", a: "Yes, noticeable play", delta: 0.25 }, { q: "wheel-spin", a: "Gritty or rough", delta: 0.25 }], inspection: ["Check axle/thru-axle tightness first.", "Check wheel play at the rim; turn the axle by hand with the wheel out — gritty means bearings.", "Identify hub make/model; cartridge bearing sizes come from the hub maker's service docs or measuring the old bearing (ID × OD × width)."], components: ["hub", "bearing", "wheelset"], complexity: "Advanced (special tools)", bearing: true },
  { id: "hub-preload", system: "wheel-bearings", title: "Loose hub preload / end caps", explanation: "Adjustable or preload-type hubs can develop play if the preload collar or end caps loosen.", base: 0.15, symptoms: { play: 0.35, knock: 0.15 }, answers: [{ q: "wheel-play", a: "Yes, noticeable play", delta: 0.2 }], inspection: ["Check preload adjuster or cup-and-cone adjustment.", "Ensure end caps are fully seated."], components: ["hub"], complexity: "Moderate (basic tools)" },
  { id: "freehub-pawls", system: "freehub", title: "Freehub pawls / ratchet dirty, worn or under-lubricated", explanation: "Slipping under load, delayed engagement or grinding when coasting points to the freehub mechanism.", base: 0.3, symptoms: { slip: 0.35, grind: 0.15, skip: 0.15, click: 0.1 }, answers: [{ q: "noise-when", a: "When coasting", delta: 0.2 }, { q: "skip-gears", a: "Only under hard effort", delta: 0.15 }], inspection: ["Does the pedal stroke slip without the chain skipping on the cassette? That is the freehub, not the drivetrain.", "Service the freehub: clean and use the hub maker's specified grease (pawl hubs and ratchet hubs differ)."], components: ["hub", "wheelset"], complexity: "Moderate (basic tools)", bearing: true },
  { id: "freehub-bearings", system: "freehub", title: "Worn freehub-body bearings", explanation: "Freehub body bearings wear and cause rough coasting or cassette wobble.", base: 0.12, symptoms: { grind: 0.2, play: 0.2, rough: 0.2 }, answers: [{ q: "noise-when", a: "When coasting", delta: 0.1 }], inspection: ["Remove the cassette and check the freehub body for play and roughness."], components: ["hub", "bearing"], complexity: "Advanced (special tools)", bearing: true },
  { id: "spoke-tension", system: "wheel-bearings", title: "Loose spokes or untrue wheel", explanation: "Low spoke tension causes pinging, clicking or a wheel that rubs at one point.", base: 0.15, symptoms: { click: 0.15, rub: 0.15, play: 0.1 }, answers: [{ q: "wheel-spin", a: "Rubs at one point", delta: 0.1 }], inspection: ["Squeeze spoke pairs: any notably loose spokes?", "Spin the wheel and check lateral wobble against the brake/frame."], components: ["wheelset"], complexity: "Moderate (basic tools)" },
  // Headset & cockpit
  { id: "headset-loose", system: "headset", title: "Loose headset preload", explanation: "A clunk when braking or rocking the bike usually means the headset preload has loosened.", base: 0.3, symptoms: { play: 0.35, knock: 0.3, click: 0.1 }, answers: [{ q: "headset-brake-test", a: "Yes, a clunk", delta: 0.35 }], inspection: ["Hold the front brake and rock the bike — feel at the top headset cup.", "Loosen stem bolts, adjust top-cap preload, align, re-torque stem bolts to spec."], components: ["stem", "fork"], complexity: "Moderate (basic tools)", safety: "stop" },
  { id: "headset-bearings", system: "headset", title: "Worn or corroded headset bearings", explanation: "Notchy or rough steering ('indexed' at straight-ahead) indicates damaged headset bearings.", base: 0.25, symptoms: { rough: 0.35, grind: 0.2, creak: 0.15 }, answers: [{ q: "steering-feel", a: "Notchy / indexed", delta: 0.35 }, { q: "steering-feel", a: "Rough or gritty", delta: 0.3 }], inspection: ["Lift the front wheel and turn the bars slowly.", "Identify the headset using its SHIS code (e.g. IS42/28.6 | IS52/40) or the frame maker's documentation, then measure the bearing (ID × OD × width × angle)."], components: ["bearing", "fork"], complexity: "Moderate (basic tools)", safety: "caution", bearing: true },
  { id: "cockpit-loose", system: "cockpit", title: "Loose stem or handlebar clamp", explanation: "A moving stem or bar is a steering-safety issue.", base: 0.15, symptoms: { play: 0.3, creak: 0.2, click: 0.1 }, answers: [{ q: "noise-when", a: "When turning the handlebar", delta: 0.1 }], inspection: ["Check stem steerer and faceplate bolts against the torque printed on the stem.", "Check for cracks around the clamps (especially carbon)."], components: ["stem", "handlebar"], complexity: "Easy (home)", safety: "stop" },
  // Drivetrain
  { id: "chain-worn", system: "chain", title: "Worn (stretched) chain", explanation: "A worn chain skips under load and wears the cassette and chainrings.", base: 0.3, symptoms: { skip: 0.35, grind: 0.1 }, answers: [{ q: "chain-wear", a: "Checker shows worn (≥0.5–0.75%)", delta: 0.4 }, { q: "chain-wear", a: "Not measured — over ~3,000 km", delta: 0.15 }, { q: "skip-gears", a: "Only under hard effort", delta: 0.1 }], inspection: ["Measure with a chain checker (replace around 0.5% for 11–12 speed, 0.75% for 8–10 speed).", "Check for stiff links."], components: ["chain"], complexity: "Easy (home)" },
  { id: "cassette-worn", system: "cassette", title: "Worn cassette cogs", explanation: "If a new chain skips on the most-used cogs, those cogs are worn.", base: 0.18, symptoms: { skip: 0.3 }, answers: [{ q: "skip-gears", a: "Mostly the smallest cogs (most-used)", delta: 0.3 }, { q: "chain-wear", a: "Checker shows worn (≥0.5–0.75%)", delta: 0.1 }], inspection: ["Look for hooked / shark-fin teeth on the most-used cogs.", "Replace chain and cassette together if the chain was badly worn."], components: ["cassette", "chain"], complexity: "Moderate (basic tools)" },
  { id: "indexing", system: "derailleurs", title: "Cable tension / indexing out of adjustment", explanation: "New cables stretch and housings settle, causing hesitant shifts or ghost shifting.", base: 0.3, symptoms: { skip: 0.3, click: 0.15 }, answers: [{ q: "recent-work", a: "New cable or housing", delta: 0.25 }, { q: "skip-gears", a: "Only when shifting", delta: 0.2 }, { q: "recent-work", a: "Wheel removed / swapped", delta: 0.1 }], inspection: ["Shift to the smallest cog, then use the barrel adjuster in quarter turns.", "Check cable for fraying and housing for kinks.", "Electronic groupsets: run the manufacturer's micro-adjust procedure."], components: ["rear-derailleur", "shifters"], complexity: "Easy (home)" },
  { id: "hanger-bent", system: "derailleurs", title: "Bent derailleur hanger", explanation: "A knock to the drive side bends the hanger and throws off shifting everywhere.", base: 0.15, symptoms: { skip: 0.2, rub: 0.1 }, answers: [{ q: "recent-work", a: "Crash or the bike fell on its drive side", delta: 0.4 }], inspection: ["Look from behind: the derailleur cage should be vertical and in line with the cogs.", "A workshop alignment gauge can straighten it; replace if cracked. UDH frames use a standard hanger."], components: ["rear-derailleur"], complexity: "Workshop recommended" },
  // Brakes
  { id: "brake-air", system: "brakes", title: "Air in hydraulic brake system", explanation: "A spongy lever that pulls to the bar points to air in the hose or caliper.", base: 0.3, symptoms: { spongy: 0.45 }, answers: [{ q: "brake-lever", a: "Spongy / pulls toward the bar", delta: 0.35 }], inspection: ["Bleed using the correct fluid (mineral oil vs DOT — never mix).", "Check for leaks at the caliper and lever."], components: ["brakes"], complexity: "Advanced (special tools)", safety: "stop" },
  { id: "brake-contaminated", system: "brakes", title: "Contaminated pads or rotor", explanation: "Oil or lube on pads/rotor causes squealing and much weaker braking.", base: 0.25, symptoms: { squeal: 0.35 }, answers: [{ q: "brake-contamination", a: "Yes / possibly", delta: 0.35 }, { q: "brake-lever", a: "Firm but weak stopping", delta: 0.25 }], inspection: ["Inspect pads for glazing or dark oily patches.", "Replace contaminated pads; clean rotor with isopropyl alcohol; bed in new pads."], components: ["brakes"], complexity: "Moderate (basic tools)", safety: "stop" },
  { id: "pads-worn", system: "brakes", title: "Worn brake pads", explanation: "Worn pads reduce power and can damage the rotor or rim once the backing plate contacts.", base: 0.2, symptoms: { squeal: 0.15, grind: 0.2 }, answers: [{ q: "brake-lever", a: "Firm but weak stopping", delta: 0.15 }], inspection: ["Check pad material thickness (replace below the maker's minimum, often ~0.5 mm on disc pads).", "Rim brakes: check wear indicators on the rim."], components: ["brakes"], complexity: "Easy (home)", safety: "stop" },
  { id: "rotor-rub", system: "rotors", title: "Caliper misalignment or bent rotor", explanation: "Rotor rubbing after a wheel swap is usually alignment; rubbing at one point is a bent rotor.", base: 0.35, symptoms: { rub: 0.45, squeal: 0.1 }, answers: [{ q: "recent-work", a: "Wheel removed / swapped", delta: 0.25 }, { q: "wheel-spin", a: "Rubs at one point", delta: 0.2 }], inspection: ["Check the wheel/thru-axle is fully seated.", "Loosen caliper bolts, squeeze the lever, re-tighten (re-centre).", "Spin and sight through the caliper; true a bent rotor with a rotor tool."], components: ["brakes", "wheelset"], complexity: "Easy (home)" },
  // Suspension & frame
  { id: "air-spring-leak", system: "suspension", title: "Air spring losing pressure", explanation: "Suspension that sinks over time is usually leaking air past seals.", base: 0.25, symptoms: { slip: 0.25, inconsistent: 0.2 }, answers: [{ q: "suspension-symptom", a: "Sinks / loses air over time", delta: 0.4 }], inspection: ["Check pressure with a shock pump before and after a ride.", "Lower-leg / air-can service per the manufacturer's interval."], components: ["fork"], complexity: "Workshop recommended" },
  { id: "suspension-service", system: "suspension", title: "Overdue suspension service / damper issue", explanation: "Harsh, sticky or inconsistent damping usually means dry seals, degraded oil or damper issues.", base: 0.25, symptoms: { inconsistent: 0.3, rough: 0.2, knock: 0.1 }, answers: [{ q: "suspension-symptom", a: "Feels harsh or sticky", delta: 0.3 }, { q: "suspension-symptom", a: "Oil on the stanchions", delta: 0.3 }, { q: "suspension-symptom", a: "Bounces back too fast", delta: 0.15 }], inspection: ["Clean stanchions, check for scratches and oil.", "Check sag and rebound settings against the manufacturer's chart.", "Lower-leg service; damper service at a suspension centre."], components: ["fork"], complexity: "Workshop recommended" },
  { id: "pivot-bearings", system: "suspension", title: "Worn suspension pivot bearings", explanation: "Play or knocking from the rear end of a full-suspension bike often comes from linkage bearings.", base: 0.15, symptoms: { play: 0.3, knock: 0.2, creak: 0.15 }, answers: [{ q: "noise-when", a: "Over bumps", delta: 0.15 }], inspection: ["Lift the rear wheel and feel for play at the pivots.", "Check pivot bolt torque. Bearing sizes come from the frame maker's service documentation."], components: ["bearing"], complexity: "Advanced (special tools)", bearing: true },
  { id: "frame-crack", system: "frame", title: "Possible frame or fork damage", explanation: "Creaks that persist after checking everything else, or any visible crack, can mean structural damage.", base: 0.05, symptoms: { creak: 0.1 }, answers: [{ q: "frame-inspection", a: "Found a crack / suspicious line", delta: 0.8 }, { q: "recent-work", a: "Crash or the bike fell on its drive side", delta: 0.1 }], inspection: ["Clean the frame and inspect under good light, especially the head tube, BB area, dropouts and welds.", "Carbon: a tap test can indicate delamination but is not conclusive — have it professionally inspected."], components: ["frame", "fork"], complexity: "Workshop recommended", safety: "stop" },
  // Tyres
  { id: "puncture", system: "tires", title: "Puncture, slow leak or tubeless seal failure", explanation: "Repeated pressure loss comes from a puncture, valve, rim tape or dried sealant.", base: 0.35, symptoms: { flat: 0.5 }, inspection: ["Inflate and listen / use soapy water to find the leak.", "Tubeless: check sealant level, valve core and rim tape.", "Check the tyre casing for embedded debris."], components: ["tires"], complexity: "Easy (home)" },
  { id: "pressure", system: "tires", title: "Tyre pressure unsuitable", explanation: "Too low pressure risks pinch flats and rim damage; too high reduces grip and comfort.", base: 0.12, symptoms: { flat: 0.1, inconsistent: 0.05 }, inspection: ["Check pressure with a gauge before each ride.", "Use the rim and tyre manufacturer's limits (hookless rims have lower maximums)."], components: ["tires"], complexity: "Easy (home)" },
];
