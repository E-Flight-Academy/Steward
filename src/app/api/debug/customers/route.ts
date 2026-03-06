import { NextResponse } from "next/server";
import { getSession } from "@/lib/shopify-auth";
import { getAllCustomers } from "@/lib/airtable";

const ADMIN_EMAILS = ["matthijs@eflight.nl", "matthijscollard@gmail.com", "wesley@eflight.nl", "paulien@eflight.nl"];

export async function GET() {
  try {
    const session = await getSession();
    const email = session?.customer?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: `unauthorized (${email || "no session"})` }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "session error" }, { status: 401 });
  }

  try {
    const customers = await getAllCustomers();
    return NextResponse.json(customers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[debug/customers] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
