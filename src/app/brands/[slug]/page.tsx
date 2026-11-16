import type { Metadata } from "next";
import { BRANDS } from "@/data/brands";
import { BrandProfile } from "./BrandProfile";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = BRANDS.find((x) => x.slug === slug);
  return b ? { title: `${b.name} bicycles`, description: `${b.name} (${b.country}): ${b.description}` } : { title: "Brand" };
}

export function generateStaticParams() {
  return BRANDS.map((b) => ({ slug: b.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BrandProfile slug={slug} />;
}
