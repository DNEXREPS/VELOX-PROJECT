import type { Metadata } from "next";
import { GarageBikeProfile } from "./GarageBikeProfile";

export const metadata: Metadata = { title: "Garage bike" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GarageBikeProfile id={id} />;
}
