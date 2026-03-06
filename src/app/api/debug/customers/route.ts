import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/shopify-auth";

const ADMIN_EMAILS = ["matthijs@eflight.nl", "matthijscollard@gmail.com", "wesley@eflight.nl", "paulien@eflight.nl"];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const email = session?.customer?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: `unauthorized (${email || "no session"})` }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "session error" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  // Read env at request time to debug token issues
  const token = process.env.AIRTABLE_TOKEN || "";
  const baseId = process.env.AIRTABLE_BASE_ID || "";

  if (!token || !baseId) {
    return NextResponse.json({ error: `env missing: token=${!!token}, base=${!!baseId}` }, { status: 500 });
  }

  try {
    const q = query.replace(/"/g, '\\"');
    const formula = `OR(FIND(LOWER("${q}"), LOWER({Client E-Mail})), FIND(LOWER("${q}"), LOWER(ARRAYJOIN({Name}))))`;
    const fields = ["Client E-Mail", "Name", "Wings Role"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent("Customers")}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=10&${fields}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json({
        error: `Airtable ${response.status}`,
        detail: body,
        tokenPrefix: token.substring(0, 8),
        baseId,
      }, { status: 500 });
    }

    const data = await response.json();
    const customers = [];
    for (const rec of data.records) {
      const e = rec.fields["Client E-Mail"];
      if (!e) continue;
      customers.push({
        email: e,
        name: rec.fields.Name?.[0] || e.split("@")[0],
        roles: rec.fields["Wings Role"] || [],
      });
    }
    return NextResponse.json(customers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
