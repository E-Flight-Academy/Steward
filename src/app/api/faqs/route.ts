import { NextRequest, NextResponse } from "next/server";
import { getFaqs, syncFaqs } from "@/lib/faq";

export async function GET(request: NextRequest) {
  try {
    const fresh = request.nextUrl.searchParams.get("fresh") === "true";
    const faqs = fresh ? await syncFaqs() : await getFaqs();
    return NextResponse.json(faqs);
  } catch (err) {
    console.error("Failed to fetch FAQs:", err);
    return NextResponse.json([], { status: 200 });
  }
}
