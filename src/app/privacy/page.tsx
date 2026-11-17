import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy">What VELOX stores and why. The site owner should have this reviewed before public launch.</PageHeader>
      <div className="container-x max-w-3xl space-y-6 py-12 text-[15px] leading-relaxed text-muted">
        <p><span className="text-fg">Without an account</span> nothing personal leaves your browser: your garage, builds, favourites and preferences are stored on this device only.</p>
        <p><span className="text-fg">With an account</span> we store your name, email address, (for Google sign-in) your Google profile picture, and the data you choose to save — garage, builds, favourites, compare list, upgrade plans, AI Mechanic history and preferences. Access is restricted to you by database row-level security.</p>
        <p><span className="text-fg">Authentication</span> is handled by Supabase Auth. Passwords are never stored by VELOX in readable form. Google sign-in uses Google’s official OAuth flow; VELOX never sees your Google password.</p>
        <p><span className="text-fg">Deletion.</span> Account settings → Delete account permanently removes your account and all personal data stored with it.</p>
      </div>
    </>
  );
}
