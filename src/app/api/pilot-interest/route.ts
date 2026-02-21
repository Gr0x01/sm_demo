import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { sendPilotInterestEmail } from "@/lib/email";

const pilotSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = pilotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    await sendPilotInterestEmail(parsed.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pilot-interest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
