"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { authConfigured, googleEnabled, safeNext } from "@/lib/supabase/client";
import { sendPasswordReset, signInWithGoogle, signInWithPassword, signUpWithEmail, updatePassword, useAuth, type AuthResult } from "@/lib/auth";
import { useT, type TKey } from "@/lib/i18n";
import { cx } from "@/lib/format";
import { toast } from "@/components/ui/toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordOk = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

function errorKey(r: AuthResult): TKey {
  if (r.ok) return "auth.genericError";
  return ({ invalid: "auth.invalid", "not-confirmed": "auth.notConfirmed", "rate-limited": "auth.rateLimited", unavailable: "auth.unavailable", "weak-password": "auth.pwRules", error: "auth.genericError" } as const)[r.code];
}

export function AuthShell({ title, subtitle, children, back = true }: { title: string; subtitle?: string; children: React.ReactNode; back?: boolean }) {
  return (
    <section className="container-x grid min-h-[calc(100svh-68px)] gap-12 py-12 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-20">
      <div className="hidden lg:block">
        <p className="eyebrow">VELOX</p>
        <p className="display mt-6 text-[clamp(2.6rem,5vw,4.4rem)]">Ride smarter.<br /><span className="text-muted">Everywhere you go.</span></p>
        <ul className="mt-10 max-w-md space-y-3 text-sm text-muted">
          {["My Garage, builds and favourites on every device", "Upgrade plans and AI Mechanic history saved to your account", "Browsing, search and comparison stay open — no account needed"].map((x) => <li key={x} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-lime" />{x}</li>)}
        </ul>
      </div>
      <div className="w-full max-w-[440px] justify-self-center lg:justify-self-end">
        {back && <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> VELOX</Link>}
        <div className="flex items-center gap-3"><span className="font-semibold tracking-[0.3em]">VELOX</span><span className="h-px flex-1 bg-line" /></div>
        <h1 className="mt-8 text-3xl font-medium tracking-tight">{title}</h1>
        {subtitle && <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        <p className="mt-10 text-xs text-subtle"><Link href="/terms" className="link-u">Terms</Link> · <Link href="/privacy" className="link-u">Privacy</Link></p>
      </div>
    </section>
  );
}

function Unavailable() {
  const t = useT();
  return (
    <div className="border hairline p-5" role="status">
      <p className="font-medium">{t("auth.unavailable")}</p>
      <p className="mt-2 text-sm text-muted">{t("auth.unavailableBody")}</p>
      <Link href="/bikes" className="mt-4 inline-block text-sm text-lime link-u">Browse bikes →</Link>
    </div>
  );
}

function Input({ id, label, error, type = "text", ...rest }: { id: string; label: string; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div>
      <label htmlFor={id} className="label-tech mb-1.5 block">{label}</label>
      <div className="relative">
        <input id={id} type={isPw && show ? "text" : type} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={cx("field", isPw && "pr-11", error && "border-bad/60")} {...rest} />
        {isPw && <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-subtle hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
      </div>
      {error && <p id={`${id}-err`} className="mt-1.5 text-xs text-bad" role="alert">{error}</p>}
    </div>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-lime font-medium text-ink-950 transition-opacity hover:opacity-90 disabled:opacity-60">
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.working")}</> : children}
    </button>
  );
}

export function GoogleButton({ next }: { next: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (!googleEnabled) return <p className="border hairline px-4 py-3 text-xs text-muted">{t("auth.googleUnavailable")}</p>;
  return (
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); const r = await signInWithGoogle(next); if (!r.ok) { setBusy(false); toast(t(errorKey(r)), { tone: "error" }); } }}
      className="inline-flex h-11 w-full items-center justify-center gap-3 border border-line-strong bg-white/[0.03] text-[15px] transition-colors hover:border-fg/40 disabled:opacity-60">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <svg aria-hidden viewBox="0 0 48 48" className="h-[18px] w-[18px]"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
      )}
      {t("auth.google")}
    </button>
  );
}

function Divider() {
  const t = useT();
  return <div className="my-6 flex items-center gap-4 text-xs text-subtle"><span className="h-px flex-1 bg-line" />{t("auth.or")}<span className="h-px flex-1 bg-line" /></div>;
}

/* --------------------------------- pages --------------------------------- */

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (sp.get("error")) setErr(t("auth.callbackError")); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (auth.status === "signed-in") router.replace(next); }, [auth.status, next, router]);
  if (!authConfigured) return <AuthShell title={t("auth.welcome")} subtitle={t("auth.welcomeSub")}><Unavailable /></AuthShell>;
  return (
    <AuthShell title={t("auth.welcome")} subtitle={t("auth.welcomeSub")}>
      <GoogleButton next={next} />
      <Divider />
      <form noValidate className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (!EMAIL_RE.test(email.trim())) return setErr(t("auth.emailInvalid"));
        if (!password) return setErr(t("auth.invalid"));
        setBusy(true); const r = await signInWithPassword(email, password, remember); setBusy(false);
        if (!r.ok) return setErr(t(errorKey(r)));
        toast(t("auth.signedIn")); router.replace(next);
      }}>
        <Input id="email" label={t("auth.email")} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input id="password" label={t("auth.password")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#C5F36A]" />{t("auth.remember")}</label>
          <Link href="/forgot-password" className="text-muted link-u hover:text-fg">{t("auth.forgot")}</Link>
        </div>
        {err && <p className="border border-bad/30 bg-bad/[0.06] px-3 py-2 text-sm text-bad" role="alert">{err}</p>}
        <Submit busy={busy}>{t("auth.signIn")}</Submit>
      </form>
      <p className="mt-6 text-sm text-muted">{t("auth.noAccount")} <Link href={`/signup${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-lime link-u">{t("auth.signUp")}</Link></p>
    </AuthShell>
  );
}

export function SignupForm() {
  const t = useT();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"), "/account?welcome=1");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errs, setErrs] = useState<Partial<Record<keyof typeof f | "form", string>>>({});
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState<string | null>(null);
  if (!authConfigured) return <AuthShell title={t("auth.createTitle")} subtitle={t("auth.createSub")}><Unavailable /></AuthShell>;
  if (sent) return (
    <AuthShell title={t("auth.checkEmail")}>
      <div className="flex gap-4 border hairline p-5" role="status"><MailCheck className="h-6 w-6 shrink-0 text-lime" /><p className="text-sm text-muted">{t("auth.checkEmailBody", { email: sent })}</p></div>
      <Link href="/login" className="mt-6 inline-block text-sm text-lime link-u">{t("auth.signIn")} →</Link>
    </AuthShell>
  );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: k === "terms" ? e.target.checked : e.target.value }));
  return (
    <AuthShell title={t("auth.createTitle")} subtitle={t("auth.createSub")}>
      <GoogleButton next={next} />
      <Divider />
      <form noValidate className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const er: typeof errs = {};
        if (!f.name.trim()) er.name = t("auth.nameRequired");
        if (!EMAIL_RE.test(f.email.trim())) er.email = t("auth.emailInvalid");
        if (!passwordOk(f.password)) er.password = t("auth.pwRules");
        if (f.password !== f.confirm) er.confirm = t("auth.pwMismatch");
        if (!f.terms) er.terms = t("auth.termsRequired");
        setErrs(er); if (Object.keys(er).length) return;
        setBusy(true); const r = await signUpWithEmail(f.name, f.email, f.password, next); setBusy(false);
        if (!r.ok) return setErrs({ form: t(errorKey(r)) });
        setSent(f.email.trim());
      }}>
        <Input id="name" label={t("auth.fullName")} autoComplete="name" value={f.name} onChange={set("name")} error={errs.name} maxLength={80} />
        <Input id="email" label={t("auth.email")} type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} error={errs.email} />
        <Input id="password" label={t("auth.password")} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} error={errs.password} />
        {!errs.password && <p className="-mt-2 text-xs text-subtle">{t("auth.pwRules")}</p>}
        <Input id="confirm" label={t("auth.passwordConfirm")} type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} error={errs.confirm} />
        <label className="flex items-start gap-2.5 text-sm text-muted"><input type="checkbox" checked={f.terms} onChange={set("terms")} className="mt-0.5 h-4 w-4 accent-[#C5F36A]" aria-invalid={!!errs.terms} />
          <span>{t("auth.terms")} — <Link href="/terms" className="link-u">{t("auth.termsLink")}</Link>, <Link href="/privacy" className="link-u">{t("auth.privacyLink")}</Link></span></label>
        {errs.terms && <p className="-mt-2 text-xs text-bad" role="alert">{errs.terms}</p>}
        {errs.form && <p className="border border-bad/30 bg-bad/[0.06] px-3 py-2 text-sm text-bad" role="alert">{errs.form}</p>}
        <Submit busy={busy}>{t("auth.signUp")}</Submit>
      </form>
      <p className="mt-6 text-sm text-muted">{t("auth.haveAccount")} <Link href="/login" className="text-lime link-u">{t("auth.signIn")}</Link></p>
    </AuthShell>
  );
}

export function ForgotForm() {
  const t = useT();
  const [email, setEmail] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  if (!authConfigured) return <AuthShell title={t("auth.resetTitle")}><Unavailable /></AuthShell>;
  return (
    <AuthShell title={t("auth.resetTitle")} subtitle={done ? undefined : t("auth.resetSub")}>
      {done ? <div className="flex gap-4 border hairline p-5" role="status"><MailCheck className="h-6 w-6 shrink-0 text-lime" /><p className="text-sm text-muted">{t("auth.resetSent")}</p></div> : (
        <form noValidate className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setErr(null);
          if (!EMAIL_RE.test(email.trim())) return setErr(t("auth.emailInvalid"));
          setBusy(true); const r = await sendPasswordReset(email); setBusy(false);
          if (!r.ok) return setErr(t(errorKey(r)));
          setDone(true);
        }}>
          <Input id="email" label={t("auth.email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err} />
          <Submit busy={busy}>{t("auth.sendReset")}</Submit>
        </form>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm text-muted link-u hover:text-fg">← {t("auth.signIn")}</Link>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const auth = useAuth();
  const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (!authConfigured) return <AuthShell title={t("auth.newPasswordTitle")}><Unavailable /></AuthShell>;
  if (auth.status === "signed-out") return <AuthShell title={t("auth.newPasswordTitle")}><p className="text-sm text-muted" role="alert">{t("auth.callbackError")}</p><Link href="/forgot-password" className="mt-4 inline-block text-sm text-lime link-u">{t("auth.sendReset")} →</Link></AuthShell>;
  return (
    <AuthShell title={t("auth.newPasswordTitle")}>
      <form noValidate className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (!passwordOk(pw)) return setErr(t("auth.pwRules"));
        if (pw !== confirm) return setErr(t("auth.pwMismatch"));
        setBusy(true); const r = await updatePassword(pw); setBusy(false);
        if (!r.ok) return setErr(t(errorKey(r)));
        toast(t("auth.passwordSaved")); router.replace("/account");
      }}>
        <Input id="new-password" label={t("auth.newPassword")} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input id="confirm" label={t("auth.passwordConfirm")} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={err} />
        <p className="text-xs text-subtle">{t("auth.pwRules")}</p>
        <Submit busy={busy || auth.status === "loading"}>{t("auth.savePassword")}</Submit>
      </form>
    </AuthShell>
  );
}
