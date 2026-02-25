import { NextResponse } from "next/server";
import { runDraft } from "@/lib/orchestrator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const intake = await req.json();
    const state = await runDraft(intake);
    return NextResponse.json(state);
  } catch (err: any) {
    const message = err?.message ?? "Unknown error";
    const details = err?.details ?? err?.errors ?? undefined;
    return NextResponse.json({ error: message, details }, { status: 400 });
  }
}
