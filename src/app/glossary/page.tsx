import type { Metadata } from "next";
import { GlossaryList } from "./GlossaryList";

export const metadata: Metadata = { title: "Cycling glossary", description: "Plain-language explanations of cycling terms: groupset, bottom bracket, headset, freehub, thru-axle, rim depth, tyre clearance and more." };

export default function Page() {
  return <GlossaryList />;
}
