import type { Metadata } from "next";
import { COMPONENTS } from "@/data/components";
import { ComponentDetail } from "./ComponentDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = COMPONENTS.find((x) => x.id === id);
  return c ? { title: `${c.manufacturer} ${c.name}`, description: `${c.manufacturer} ${c.name} specifications, weight, estimated IDR price and compatibility.` } : { title: "Component" };
}

export function generateStaticParams() {
  return COMPONENTS.map((c) => ({ id: c.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ComponentDetail id={id} />;
}
