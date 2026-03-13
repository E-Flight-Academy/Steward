import { NextRequest, NextResponse } from "next/server";
import { getFaqs, syncFaqs } from "@/lib/faq";
import { getSession } from "@/lib/shopify-auth";
import { getUserData } from "@/lib/airtable";

export async function GET(request: NextRequest) {
  try {
    const fresh = request.nextUrl.searchParams.get("fresh") === "true";
    const faqs = fresh ? await syncFaqs() : await getFaqs();

    // Filter FAQs by user roles: no audience = public, with audience = role must match
    let userRoles: string[] = [];
    try {
      const session = await getSession();
      if (session?.customer?.email) {
        const userData = await getUserData(session.customer.email);
        userRoles = userData.roles;
      }
    } catch {
      // No session = anonymous
    }

    const normalizedRoles = userRoles.map((r) => r.toLowerCase());
    const accessibleFaqs = faqs.filter((f) =>
      f.audience.length === 0
      || f.audience.includes("_anonymous")
      || f.audience.some((a) => normalizedRoles.includes(a))
    );

    return NextResponse.json(accessibleFaqs);
  } catch (err) {
    console.error("Failed to fetch FAQs:", err);
    return NextResponse.json([], { status: 200 });
  }
}
