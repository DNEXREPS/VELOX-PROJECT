import type { Metadata } from "next";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { BikeDetail } from "./BikeDetail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bike = BIKES.find((b) => b.slug === slug);
  if (!bike) return { title: "Bike" };
  const brand = BRANDS.find((b) => b.id === bike.brandId);
  return { title: `${brand?.name ?? ""} ${bike.name} (${bike.year})`, description: `${bike.ridingStyle}. Specifications, estimated IDR pricing, generations and comparisons on VELOX.` };
}

export function generateStaticParams() {
  return BIKES.map((b) => ({ slug: b.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BikeDetail slug={slug} />;
}
