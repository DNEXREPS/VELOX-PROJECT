"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, CloudOff, LogOut, Shield, Trash2, User } from "lucide-react";
import { buildsStore, compareStore, garageStore, mechanicHistoryStore, sessionStore, settingsStore, submissionsStore, upgradePlansStore, wishlistStore } from "@/lib/state";
import { useHydrated, useStore, type Store } from "@/lib/store";
import { authConfigured } from "@/lib/supabase/client";
import { deleteAccount, signOut, updatePassword, updateProfileName, useAuth } from "@/lib/auth";
import { getSyncStatus, onSyncStatus, type SyncStatus } from "@/lib/sync";
import { useT } from "@/lib/i18n";
import { Button, ButtonLink, Field, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { passwordOk } from "@/components/auth/AuthForms";
import type { Role } from "@/lib/types";
import { DEMO_USD_RATE } from "@/lib/format";

export default function AccountPage() {
  return <Suspense><Account /></Suspense>;
}

function Account() {
  const t = useT();
  const auth = useAuth();
  const hydrated = useHydrated();
  const sp = useSearchParams();
  useEffect(() => { if (sp.get("welcome") && auth.status === "signed-in") toast(t("auth.verified")); }, [sp, auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authConfigured) return <DemoAccount />;
  if (!hydrated || auth.status === "loading") return <div className="container-x py-16"><Skeleton className="h-72" /></div>;
  if (auth.status !== "signed-in" || !auth.user) {
    return (
      <>
        <PageHeader eyebrow={t("nav.account")} title={t("account.signedOutTitle")}>{t("auth.welcomeSub")}</PageHeader>
        <div className="container-x grid gap-14 py-12 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <div className="flex flex-wrap gap-2"><ButtonLink href="/login" size="lg">{t("auth.signIn")}</ButtonLink><ButtonLink href="/signup" variant="secondary" size="lg">{t("auth.signUp")}</ButtonLink></div>
            <div className="mt-12"><Preferences /></div>
          </div>
          <LocalData title={t("account.local")} />
        </div>
      </>
    );
  }
  return <SignedIn />;
}

function SignedIn() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(user!.name);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [del, setDel] = useState("");
  const [sync, setSync] = useState<SyncStatus>(getSyncStatus());
  useEffect(() => { const off = onSyncStatus(setSync); return () => { off(); }; }, []);
  const u = user!;
  const google = u.providers.includes("google");
  const email = u.providers.includes("email");
  return (
    <>
      <PageHeader eyebrow={t("account.title")} title={<>{u.name}</>}>{u.email}</PageHeader>
      <div className="container-x grid gap-16 py-12 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-12">
          <section aria-labelledby="h-profile">
            <h2 id="h-profile" className="text-lg font-medium">{t("account.profile")}</h2>
            <div className="mt-5 flex items-center gap-4">
              {u.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={u.avatarUrl} alt="" className="h-14 w-14 border hairline object-cover" referrerPolicy="no-referrer" />
                : <span className="flex h-14 w-14 items-center justify-center border hairline bg-ink-900">{u.role === "admin" ? <Shield className="h-6 w-6 text-lime" /> : <User className="h-6 w-6" />}</span>}
              <div className="min-w-0"><p className="truncate font-medium">{u.email}</p><p className="label-tech">{u.role === "admin" ? "Administrator" : "Rider"}{u.emailConfirmed ? " · email confirmed" : ""}</p></div>
            </div>
            <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={async (e) => { e.preventDefault(); const r = await updateProfileName(name); toast(r.ok ? t("account.saved") : t("auth.genericError"), { tone: r.ok ? "success" : "error" }); }}>
              <Field label={t("account.name")} htmlFor="acc-name" className="min-w-56 flex-1"><input id="acc-name" className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
              <Button type="submit" variant="secondary">{t("account.save")}</Button>
            </form>
          </section>

          <section aria-labelledby="h-methods">
            <h2 id="h-methods" className="text-lg font-medium">{t("account.connected")}</h2>
            <ul className="mt-4 divide-y divide-line border-y hairline text-sm">
              <li className="flex items-center justify-between py-3"><span>Google</span><span className={google ? "text-lime" : "text-subtle"}>{google ? t("account.googleConnected") : "—"}</span></li>
              <li className="flex items-center justify-between py-3"><span>{t("account.emailPassword")}</span><span className={email ? "text-lime" : "text-subtle"}>{email ? "✓" : "—"}</span></li>
            </ul>
          </section>

          <section aria-labelledby="h-pw">
            <h2 id="h-pw" className="text-lg font-medium">{email ? t("account.changePassword") : t("account.password")}</h2>
            {!email && <p className="mt-2 text-xs text-subtle">You signed in with Google. Setting a password adds email sign-in as a second method.</p>}
            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={async (e) => {
              e.preventDefault();
              if (!passwordOk(pw.next)) return toast(t("auth.pwRules"), { tone: "error" });
              if (pw.next !== pw.confirm) return toast(t("auth.pwMismatch"), { tone: "error" });
              const r = await updatePassword(pw.next); toast(r.ok ? t("account.saved") : t("auth.genericError"), { tone: r.ok ? "success" : "error" }); if (r.ok) setPw({ next: "", confirm: "" });
            }}>
              <Field label={t("auth.newPassword")} htmlFor="acc-pw"><input id="acc-pw" type="password" className="field" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
              <Field label={t("auth.passwordConfirm")} htmlFor="acc-pw2"><input id="acc-pw2" type="password" className="field" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
              <Button type="submit" variant="secondary">{t("auth.savePassword")}</Button>
            </form>
          </section>

          <Preferences />
        </div>

        <div className="space-y-12">
          <section aria-labelledby="h-data">
            <h2 id="h-data" className="flex items-center gap-2 text-lg font-medium">{t("account.data")}
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-normal text-muted" role="status" aria-live="polite">
                {sync === "error" || sync === "offline" ? <CloudOff className="h-3.5 w-3.5 text-warn" /> : <CheckCircle2 className="h-3.5 w-3.5 text-lime" />}
                {sync === "syncing" ? "Syncing…" : sync === "error" ? "Sync failed — will retry on the next change" : sync === "offline" ? "Offline" : t("account.syncStatus")}
              </span>
            </h2>
            <LocalData title="" />
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/garage" variant="secondary">{t("nav.garage")}</ButtonLink>
              {u.role === "admin" && <ButtonLink href="/admin">Admin Panel</ButtonLink>}
              <Button variant="ghost" onClick={async () => { await signOut(); toast(t("auth.signedOut"), { tone: "info" }); router.replace("/"); }}><LogOut className="h-4 w-4" /> {t("auth.signOut")}</Button>
            </div>
          </section>

          <section aria-labelledby="h-delete" className="border border-bad/30 p-5">
            <h2 id="h-delete" className="text-lg font-medium text-bad">{t("account.delete")}</h2>
            <p className="mt-2 text-sm text-muted">{t("account.deleteBody")}</p>
            <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={async (e) => {
              e.preventDefault(); if (del !== "DELETE") return;
              const r = await deleteAccount();
              if (!r.ok) return toast(t("auth.genericError"), { body: r.message, tone: "error" });
              toast(t("account.deleted"), { tone: "info" }); router.replace("/");
            }}>
              <Field label={t("account.deleteConfirm")} htmlFor="acc-del" className="flex-1"><input id="acc-del" className="field" value={del} onChange={(e) => setDel(e.target.value)} autoComplete="off" /></Field>
              <Button type="submit" variant="secondary" disabled={del !== "DELETE"} className="border-bad/50 text-bad"><Trash2 className="h-4 w-4" /> {t("account.delete")}</Button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

function Preferences() {
  const t = useT();
  const s = useStore(settingsStore);
  return (
    <section aria-labelledby="h-prefs">
      <h2 id="h-prefs" className="text-lg font-medium">{t("account.prefs")}</h2>
      <div className="mt-5 space-y-5">
        <div><p className="label-tech mb-2">{t("account.currency")}</p><Segmented value={s.currency} onChange={(v) => settingsStore.set((x) => ({ ...x, currency: v }))} options={[{ value: "IDR", label: "IDR (Rp)" }, { value: "USD", label: "USD (US$)" }]} />
          <p className="mt-1.5 text-xs text-subtle">IDR is the default. USD shows a manufacturer’s published USD price where one exists; otherwise IDR is converted at Bank Indonesia’s JISDOR rate (Rp {DEMO_USD_RATE.toLocaleString("id-ID")}/USD, 4 Nov 2026) and labelled.</p></div>
        <div><p className="label-tech mb-2">{t("account.units")}</p><Segmented value={s.units ?? "metric"} onChange={(v) => settingsStore.set((x) => ({ ...x, units: v }))} options={[{ value: "metric", label: t("account.metric") }, { value: "imperial", label: t("account.imperial") }]} /></div>
        <div><p className="label-tech mb-2">{t("account.language")}</p><Segmented value={s.language ?? "auto"} onChange={(v) => settingsStore.set((x) => ({ ...x, language: v }))} options={[{ value: "auto", label: t("account.auto") }, { value: "id", label: "Bahasa Indonesia" }, { value: "en", label: "English" }]} /></div>
        <fieldset>
          <legend className="label-tech mb-2">{t("account.notifications")}</legend>
          {([["priceChanges", t("account.notifyPrice")], ["productNews", t("account.notifyNews")]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2.5 py-1 text-sm text-muted"><input type="checkbox" className="h-4 w-4 accent-[#C5F36A]" checked={!!s.notifications?.[k]} onChange={(e) => settingsStore.set((x) => ({ ...x, notifications: { ...{ priceChanges: false, productNews: false }, ...x.notifications, [k]: e.target.checked } }))} />{l}</label>
          ))}
          <p className="mt-1 text-xs text-subtle">{t("account.notifyNote")}</p>
        </fieldset>
      </div>
    </section>
  );
}

function LocalData({ title }: { title: string }) {
  const t = useT();
  return (
    <div>
      {title && <h2 className="text-lg font-medium">{title}</h2>}
      <ul className="mt-4 divide-y divide-line border-y hairline text-sm">
        {([[t("nav.garage"), garageStore], ["Saved builds", buildsStore], ["Favourites", wishlistStore], [t("nav.compare"), compareStore], [t("account.plans"), upgradePlansStore], [t("account.history"), mechanicHistoryStore]] as const).map(([l, st]) => (
          <DataRow key={l} label={l} store={st as unknown as Store<unknown[]>} />
        ))}
      </ul>
    </div>
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

/** No auth provider connected: a clearly labelled developer demo session (local only, not a real account). */
function DemoAccount() {
  const t = useT();
  const s = useStore(sessionStore);
  const hydrated = useHydrated();
  const subs = useStore(submissionsStore);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Exclude<Role, "guest">>("user");
  return (
    <>
      <PageHeader eyebrow={t("nav.account")} title={t("auth.unavailable")}>
        {t("auth.unavailableBody")} For development, a <span className="text-fg">local demo session</span> below lets you try roles in this browser — it is not a real account and nothing is sent to a server. Connect Supabase (README → Authentication) to enable Google and email sign-in.
      </PageHeader>
      <div className="container-x grid gap-14 py-12 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-12">
          {!hydrated ? <Skeleton className="h-64" /> : s.signedIn ? (
            <div>
              <div className="flex items-center gap-4 border-b hairline pb-6">
                <span className="flex h-14 w-14 items-center justify-center border hairline bg-ink-900">{s.role === "admin" ? <Shield className="h-6 w-6 text-lime" /> : <User className="h-6 w-6" />}</span>
                <div><p className="text-xl font-medium">{s.name}</p><p className="label-tech">Role: {s.role} · demo session</p></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <ButtonLink href="/garage" variant="secondary">{t("nav.garage")}</ButtonLink>
                {s.role === "admin" && <ButtonLink href="/admin">Open Admin Panel</ButtonLink>}
                <ButtonLink href="/submit" variant="secondary">Submit data</ButtonLink>
                <Button variant="ghost" onClick={() => { sessionStore.set({ signedIn: false, name: "", role: "guest" }); toast("Signed out", { tone: "info" }); }}><LogOut className="h-4 w-4" /> Sign out</Button>
              </div>
              <p className="mt-8 text-sm text-muted">Your submissions: {subs.filter((x) => x.submittedBy === s.name).length} ({subs.filter((x) => x.submittedBy === s.name && x.state === "pending").length} pending review)</p>
            </div>
          ) : (
            <form className="max-w-md" onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return toast("Enter a display name", { tone: "error" });
              sessionStore.set({ signedIn: true, name: name.trim(), role });
              toast(`Signed in as ${name.trim()}`, { body: role === "admin" ? "Demo administrator — catalogue editing enabled." : undefined });
            }}>
              <Field label="Display name" htmlFor="acc-name"><input id="acc-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rani" autoComplete="nickname" /></Field>
              <div className="mt-5">
                <p className="label-tech mb-2">Demo role</p>
                <Segmented value={role} onChange={setRole} options={[{ value: "user", label: "Rider" }, { value: "admin", label: "Administrator" }]} />
                <p className="mt-2 text-xs text-subtle">Developer demo only. With Supabase connected, roles come from the database and cannot be chosen here.</p>
              </div>
              <Button type="submit" className="mt-6" size="lg">Continue</Button>
            </form>
          )}
          <Preferences />
        </div>
        <div>
          <LocalData title={t("account.local")} />
          <p className="mt-6 text-xs text-subtle">Looking for the catalogue editor? <Link href="/admin" className="link-u">Admin Panel</Link> (administrator role required).</p>
        </div>
      </div>
    </>
  );
}
