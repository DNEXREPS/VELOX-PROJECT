"use client";
import Link from "next/link";
import { GLOSSARY } from "@/lib/glossary";
import { useLang } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";

export function GlossaryList() {
  const lang = useLang();
  return (
    <>
      <PageHeader eyebrow={lang === "id" ? "Kamus" : "Glossary"} title={lang === "id" ? <>Istilah sepeda,<br /><span className="text-muted">dijelaskan sederhana.</span></> : <>Cycling terms,<br /><span className="text-muted">explained simply.</span></>}>
        {lang === "id" ? "Istilah yang bergaris titik di seluruh VELOX bisa diarahkan atau diketuk untuk penjelasan singkat. Semua penjelasan ada di sini." : "Dotted-underlined terms across VELOX can be hovered or tapped for a short explanation. Here they all are."}
      </PageHeader>
      <dl className="container-x grid gap-x-16 gap-y-10 py-12 md:grid-cols-2">
        {GLOSSARY.map((t) => { const d = lang === "id" ? t.id_ : t.en; return (
          <div key={t.id} id={t.id} className="border-t hairline pt-5"><dt className="text-lg font-medium">{d.term}</dt><dd className="mt-2 text-sm leading-relaxed text-muted">{d.text}</dd></div>
        ); })}
      </dl>
      <div className="container-x pb-16"><Link href="/bikes" className="text-lime link-u">{lang === "id" ? "Mulai cari sepeda →" : "Start finding a bike →"}</Link></div>
    </>
  );
}
