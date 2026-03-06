import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/kv-cache";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "unknown";
  const { allowed } = await checkRateLimit(`auth:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const { password } = await request.json();

  if (!process.env.SITE_PASSWORD) {
    return NextResponse.json(
      { error: "SITE_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  if (typeof password === "string" && safeEqual(password, process.env.SITE_PASSWORD)) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
