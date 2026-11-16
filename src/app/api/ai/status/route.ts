import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(aiStatus());
}
