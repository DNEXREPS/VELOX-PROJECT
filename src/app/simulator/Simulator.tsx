"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { BikePicker, PartPickers, SimulatorPanel, useBikeProfile, usePlanPicks, type Picks } from "@/components/upgrade-config";
import { ButtonLink, Chip } from "@/components/ui";

export function Simulator() {
  const sp = useSearchParams();
  const initialRef = sp.get("garage") ? `garage:${sp.get("garage")}` : sp.get("bike") ? `model:${sp.get("bike")}` : "model:polygon-strattos-s4-2024";
  const [ref, setRef] = useState(initialRef);
  const { profile, model } = useBikeProfile(ref);
  const plans = usePlanPicks(profile);
  const [picks, setPicks] = useState<Picks>({});
  const [loaded, setLoaded] = useState<string | null>(null);
  const bikeWeight = model?.weightKg ?? null;

  return (
    <div className="container-x py-10 md:py-14">
      <div className="grid gap-12 lg:grid-cols-[420px_1fr] xl:gap-16 [&>*]:min-w-0">
        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <BikePicker value={ref} onChange={(v) => { setRef(v); setPicks({}); setLoaded(null); }} />
          {plans && (
            <div>
              <p className="label-tech mb-2">Start from an Upgrade Advisor plan</p>
              <div className="flex flex-wrap gap-1.5">
                {(["budget", "balanced", "performance"] as const).map((p) => <Chip key={p} active={loaded === p} onClick={() => { setPicks(plans[p]); setLoaded(p); }}>{p[0].toUpperCase() + p.slice(1)}</Chip>)}
                <Chip active={loaded === null && Object.keys(picks).length > 0} onClick={() => { setPicks({}); setLoaded(null); }}>Custom</Chip>
              </div>
            </div>
          )}
          <PartPickers profile={profile} picks={picks} onChange={(p) => { setPicks(p); setLoaded(null); }} />
        </div>
        <div>
          {!profile ? (
            <p className="border border-dashed hairline p-10 text-sm text-muted">Choose a bike to begin.</p>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b hairline pb-5">
                <div><p className="label-tech">Simulating</p><p className="mt-1 text-2xl font-medium tracking-tight">{profile.label}</p></div>
                <ButtonLink href={`/visualizer?${ref.startsWith("garage:") ? `garage=${ref.slice(7)}` : `bike=${ref.slice(6)}`}`} variant="secondary" size="sm" className="rounded-full"><Sparkles className="h-3.5 w-3.5" /> Visualise this build</ButtonLink>
              </div>
              <SimulatorPanel profile={profile} picks={picks} bikeWeightKg={bikeWeight} />
              <p className="mt-8 text-xs text-subtle">Original-part weights are known only for bikes built in <Link href="/build" className="link-u">Build a Bike</Link>; catalogue bikes rarely publish per-part weights, so those differences show “Not Available” rather than an estimate.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
