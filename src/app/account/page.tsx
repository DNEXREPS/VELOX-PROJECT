"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, Shield, User } from "lucide-react";
import { buildsStore, compareStore, garageStore, sessionStore, submissionsStore, wishlistStore } from "@/lib/state";
import { useHydrated, useStore, type Store } from "@/lib/store";
import { Button, ButtonLink, Field, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type { Role } from "@/lib/types";

export default function AccountPage() {
  const s = useStore(sessionStore);
  const hydrated = useHydrated();
  const subs = useStore(submissionsStore);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Exclude<Role, "guest">>("user");

  return (
    <>
      <PageHeader eyebrow="Account" title={s.signedIn ? <>Hello, {s.name}.</> : <>Sign in to<br /><span className="text-muted">ride smarter.</span></>}>
        VELOX is running in <span className="text-fg">local demonstration mode</span>: no backend credentials are configured, so accounts, garages and builds are stored only in this browser. Connect Supabase (see README) to enable real authentication.
      </PageHeader>
      <div className="container-x grid gap-14 py-12 lg:grid-cols-2">
        {!hydrated ? <Skeleton className="h-64" /> : s.signedIn ? (
          <div>
            <div className="flex items-center gap-4 border-b hairline pb-6">
              <span className="flex h-14 w-14 items-center justify-center border hairline bg-ink-900">{s.role === "admin" ? <Shield className="h-6 w-6 text-lime" /> : <User className="h-6 w-6" />}</span>
              <div><p className="text-xl font-medium">{s.name}</p><p className="label-tech">Role: {s.role} · demo session</p></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/garage" variant="secondary">My Garage</ButtonLink>
              {s.role === "admin" && <ButtonLink href="/admin">Open Admin Panel</ButtonLink>}
              <ButtonLink href="/submit" variant="secondary">Submit data</ButtonLink>
              <Button variant="ghost" onClick={() => { sessionStore.set({ signedIn: false, name: "", role: "guest" }); toast("Signed out", { tone: "info" }); }}><LogOut className="h-4 w-4" /> Sign out</Button>
            </div>
            <p className="mt-8 text-sm text-muted">Your submissions: {subs.filter((x) => x.submittedBy === s.name).length} ({subs.filter((x) => x.submittedBy === s.name && x.state === "pending").length} pending review)</p>
          </div>
        ) : (
          <form
            className="max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return toast("Enter a display name", { tone: "error" });
              sessionStore.set({ signedIn: true, name: name.trim(), role });
              toast(`Signed in as ${name.trim()}`, { body: role === "admin" ? "Demo administrator — catalogue editing enabled." : undefined });
            }}
          >
            <Field label="Display name" htmlFor="acc-name"><input id="acc-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rani" autoComplete="nickname" /></Field>
            <div className="mt-5">
              <p className="label-tech mb-2">Demo role</p>
              <Segmented value={role} onChange={setRole} options={[{ value: "user", label: "Rider" }, { value: "admin", label: "Administrator" }]} />
              <p className="mt-2 text-xs text-subtle">Riders can submit data for review but cannot change catalogue records. Administrators can edit, verify, archive and import data.</p>
            </div>
            <Button type="submit" className="mt-6" size="lg">Continue</Button>
          </form>
        )}

        <div>
          <h2 className="text-lg font-medium">Local data</h2>
          <p className="mt-2 text-sm text-muted">Everything you create is stored under <code className="font-mono text-xs">velox:v1:*</code> keys in this browser&apos;s localStorage.</p>
          <ul className="mt-6 divide-y divide-line border-y hairline text-sm">
            {[["Garage bikes", garageStore], ["Saved builds", buildsStore], ["Wishlist items", wishlistStore], ["Compare list", compareStore]].map(([l, st]) => (
              <DataRow key={l as string} label={l as string} store={st as unknown as Store<unknown[]>} />
            ))}
          </ul>
          <p className="mt-6 text-xs text-subtle">Looking for the catalogue editor? <Link href="/admin" className="link-u">Admin Panel</Link> (administrator role required).</p>
        </div>
      </div>
    </>
  );
}

function DataRow({ label, store }: { label: string; store: Store<unknown[]> }) {
  const v = useStore(store);
  return (
    <li className="flex items-center justify-between py-3">
      <span>{label}</span>
      <span className="flex items-center gap-4"><span className="tabular text-muted">{v.length}</span><button className="text-xs text-subtle hover:text-bad disabled:opacity-30" disabled={!v.length} onClick={() => { if (confirm(`Clear all ${label.toLowerCase()}?`)) { store.reset(); toast(`${label} cleared`, { tone: "info" }); } }}>Clear</button></span>
    </li>
  );
}
