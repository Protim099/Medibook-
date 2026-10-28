import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/booking";

const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const parsed = q.safeParse({ date: new URL(req.url).searchParams.get("date") });
  if (!parsed.success) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  const slots = await getAvailableSlots(params.id, parsed.data.date);
  return NextResponse.json({ slots: slots.map((s) => s.startsAt.toISOString()) });
}
