import { describe, expect, it } from "vitest";
import { COMPONENTS } from "@/data/components";
import { checkBuild, type Selection } from "@/lib/compat";
import type { Component, ComponentType } from "@/lib/types";

const byId = new Map(COMPONENTS.map((c) => [c.id, c]));
const get = (id: string) => { const c = byId.get(id); if (!c) throw new Error("missing " + id); return c; };
function sel(ids: string[]): Selection {
  const s: Selection = {};
  for (const id of ids) { const c = get(id); s[c.type as ComponentType] = c as Component; }
  return s;
}
function kit(gs: string): string[] { return Object.values(get(gs).kit ?? {}) as string[]; }

describe("catalogue integrity", () => {
  it("has unique ids and resolvable kit references", () => {
    const ids = COMPONENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COMPONENTS) for (const id of Object.values(c.kit ?? {})) expect(byId.has(id as string), `${c.id} -> ${id}`).toBe(true);
  });
});

describe("compatibility engine", () => {
  it("validates a correct Tarmac SL8 + Ultegra Di2 race build", () => {
    const r = checkBuild(sel(["frame-specialized-tarmac-sl8", "fork-tarmac-sl8", ...kit("shimano-ultegra-r8100-di2"), "wheel-zipp-303-firecrest", "tire-conti-gp5000str-28", "post-tarmac-sl8", "stem-zipp-sc-sl", "bar-zipp-sl70-aero", "pedal-shimano-pd-r9100"]));
    expect(r.counts.incompatible).toBe(0);
    expect(r.checks.find((c) => c.id === "electronic")?.status).toBe("compatible");
  });

  it("flags mechanical groupset on an electronic-only frame", () => {
    const r = checkBuild(sel(["frame-specialized-tarmac-sl8", ...kit("shimano-105-r7000")]));
    expect(r.checks.find((c) => c.id === "electronic")?.status).toBe("incompatible");
    // rim brakes on a disc frame
    expect(r.checks.find((c) => c.id === "brake-mount-frame")?.status).toBe("incompatible");
  });

  it("detects freehub and axle mismatches", () => {
    const r = checkBuild(sel(["frame-specialized-allez-rim", "wheel-zipp-303-firecrest", "shimano-105-r7000-cassette"]));
    expect(r.checks.find((c) => c.id === "axle-rear")?.status).toBe("incompatible");
    const r2 = checkBuild(sel(["sram-gx-eagle-cassette", "wheel-shimano-wh-rs171"]));
    expect(r2.checks.find((c) => c.id === "freehub")?.status).toBe("incompatible");
  });

  it("reports insufficient information instead of guessing", () => {
    const r = checkBuild(sel(["frame-cannondale-caad13-disc", "post-pro-vibe-272"]));
    expect(r.checks.find((c) => c.id === "seatpost")?.status).toBe("insufficient");
  });

  it("requires UDH for SRAM Transmission", () => {
    const ok = checkBuild(sel(["frame-santa-cruz-hightower", "sram-gx-transmission-rear-derailleur"]));
    expect(ok.checks.find((c) => c.id === "udh")?.status).toBe("compatible");
    const unknown = checkBuild(sel(["frame-kona-honzo-st", "sram-gx-transmission-rear-derailleur"]));
    expect(unknown.checks.find((c) => c.id === "udh")?.status).toBe("insufficient");
  });

  it("handles tyre clearance and shims", () => {
    const r = checkBuild(sel(["frame-specialized-allez-rim", "fork-allez-rim", "tire-conti-gp5000str-32"]));
    expect(r.checks.find((c) => c.id === "clearance")?.status).toBe("incompatible");
    const shim = checkBuild(sel(["frame-santa-cruz-chameleon", "post-pro-vibe-272"]));
    expect(shim.checks.find((c) => c.id === "seatpost")?.status).toBe("potential");
  });

  it("flags drivetrain speed and pull-ratio mismatches", () => {
    const r = checkBuild(sel(["shimano-tiagra-4700-shifters", "shimano-105-r7000-rear-derailleur"]));
    expect(r.checks.find((c) => c.id === "protocol-rd")?.status).toBe("incompatible");
    expect(r.checks.find((c) => c.id === "speeds-shifters-rear-derailleur")?.status).toBe("incompatible");
  });

  it("rejects a front derailleur on a 1x crank and clamp FD on 1x frames", () => {
    const r = checkBuild(sel(["frame-santa-cruz-hightower", "shimano-deore-m6100-crankset", "shimano-altus-m2000-front-derailleur"]));
    expect(r.checks.find((c) => c.id === "chainrings")?.status).toBe("incompatible");
    expect(r.checks.find((c) => c.id === "fd-mount")?.status).toBe("incompatible");
  });

  it("builds a complete compatible BMX", () => {
    const r = checkBuild(sel(["frame-wethepeople-battleship", "fork-odyssey-f32", "odyssey-thunderbolt-crank", "kmc-z510hx", "wheel-odyssey-hazard-lite", "tire-odyssey-path-pro-20", "bar-odyssey-broc", "stem-odyssey-elementary", "post-odyssey-pivotal-254", "pedal-odyssey-twisted-pc"]));
    expect(r.counts.incompatible).toBe(0);
  });
});
