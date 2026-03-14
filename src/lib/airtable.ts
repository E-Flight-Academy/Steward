// Airtable integration — routed through E-Flight Gateway
// Falls back to direct Airtable calls if gateway is not configured

const GATEWAY_URL = process.env.GATEWAY_URL || "";
const GATEWAY_KEY = process.env.GATEWAY_API_KEY || "";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";

const useGateway = !!(GATEWAY_URL && GATEWAY_KEY);

export interface AirtableUserData {
  roles: string[];
  wingsUserId: number | null;
  name: string | null;
}

export interface AirtableCustomerSummary {
  email: string;
  name: string;
  roles: string[];
}

// ── Gateway implementations ──

async function getUserDataViaGateway(email: string): Promise<AirtableUserData> {
  const res = await fetch(`${GATEWAY_URL}/api/airtable/users?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[Airtable/Gateway] User lookup failed: ${res.status}`);
    return { roles: [], wingsUserId: null, name: null };
  }
  return res.json();
}

async function searchCustomersViaGateway(query: string): Promise<AirtableCustomerSummary[]> {
  const res = await fetch(`${GATEWAY_URL}/api/airtable/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[Airtable/Gateway] Search failed: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.results;
}

// ── Direct Airtable implementations (fallback) ──

interface AirtableRecord {
  id: string;
  fields: {
    "Client E-Mail"?: string;
    "Wings Role"?: string[];
    Name?: string[];
    "Wings User ID"?: number;
    "E-Mail 2"?: string;
    "Wings User ID 2"?: number;
  };
}

interface InstructorRecord {
  id: string;
  fields: {
    Email?: string;
    Name?: string;
    "Wings ID"?: number;
    "All Roles"?: string;
  };
}

async function queryCustomersDirect(email: string): Promise<AirtableUserData> {
  const safeEmail = email.replace(/"/g, '\\"');
  const formula = `OR(LOWER({Client E-Mail}) = LOWER("${safeEmail}"), LOWER({E-Mail 2}) = LOWER("${safeEmail}"))`;
  const fields = ["Wings Role", "Client E-Mail", "Wings User ID", "E-Mail 2", "Wings User ID 2", "Name"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent("Customers")}?filterByFormula=${encodeURIComponent(formula)}&${fields}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) return { roles: [], wingsUserId: null, name: null };

  const data: { records: AirtableRecord[] } = await response.json();
  if (data.records.length === 0) return { roles: [], wingsUserId: null, name: null };

  const record = data.records[0].fields;
  const roles = record["Wings Role"] || [];
  const matchedViaAlt = record["E-Mail 2"]?.toLowerCase() === email.toLowerCase();
  const wingsUserId = matchedViaAlt
    ? (record["Wings User ID 2"] ?? record["Wings User ID"] ?? null)
    : (record["Wings User ID"] ?? null);
  const name = record["Name"]?.[0] || null;
  return { roles, wingsUserId, name };
}

async function queryInstructorsDirect(email: string): Promise<AirtableUserData> {
  const safeEmail = email.replace(/"/g, '\\"');
  const formula = `LOWER({Email}) = LOWER("${safeEmail}")`;
  const fields = ["Email", "Wings ID", "All Roles", "Name"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent("Instructors")}?filterByFormula=${encodeURIComponent(formula)}&${fields}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) return { roles: [], wingsUserId: null, name: null };

  const data: { records: InstructorRecord[] } = await response.json();
  if (data.records.length === 0) return { roles: [], wingsUserId: null, name: null };

  const record = data.records[0].fields;
  const roles = record["All Roles"]
    ? record["All Roles"].split(",").map((r) => r.trim()).filter(Boolean)
    : [];
  const wingsUserId = record["Wings ID"] ?? null;
  const name = record["Name"] || null;
  return { roles, wingsUserId, name };
}

async function getUserDataDirect(email: string): Promise<AirtableUserData> {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn("Airtable not configured");
    return { roles: [], wingsUserId: null, name: null };
  }

  const [customerData, instructorData] = await Promise.all([
    queryCustomersDirect(email),
    queryInstructorsDirect(email),
  ]);

  const allRoles = [...new Set([...customerData.roles, ...instructorData.roles])];
  const wingsUserId = customerData.wingsUserId ?? instructorData.wingsUserId;
  const name = customerData.name ?? instructorData.name;
  return { roles: allRoles, wingsUserId, name };
}

async function searchCustomersDirect(query: string): Promise<AirtableCustomerSummary[]> {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    throw new Error(`Airtable not configured: token=${!!AIRTABLE_TOKEN}, base=${!!AIRTABLE_BASE_ID}`);
  }

  const q = query.replace(/"/g, '\\"');
  const customerFormula = `OR(FIND(LOWER("${q}"), LOWER({Client E-Mail})), FIND(LOWER("${q}"), LOWER(ARRAYJOIN({Name}))), FIND(LOWER("${q}"), LOWER({E-Mail 2})))`;
  const customerFields = ["Client E-Mail", "Name", "Wings Role", "E-Mail 2"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
  const customerUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent("Customers")}?filterByFormula=${encodeURIComponent(customerFormula)}&maxRecords=10&${customerFields}`;

  const instructorFormula = `OR(FIND(LOWER("${q}"), LOWER({Email})), FIND(LOWER("${q}"), LOWER({Name})))`;
  const instructorFields = ["Email", "Name", "All Roles"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
  const instructorUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent("Instructors")}?filterByFormula=${encodeURIComponent(instructorFormula)}&maxRecords=10&${instructorFields}`;

  const headers = { Authorization: `Bearer ${AIRTABLE_TOKEN}` };

  const [customerRes, instructorRes] = await Promise.all([
    fetch(customerUrl, { headers, next: { revalidate: 60 } }),
    fetch(instructorUrl, { headers, next: { revalidate: 60 } }),
  ]);

  const results = new Map<string, AirtableCustomerSummary>();

  if (customerRes.ok) {
    const data = await customerRes.json();
    for (const rec of data.records) {
      const primaryEmail = rec.fields["Client E-Mail"];
      const altEmail = rec.fields["E-Mail 2"];
      const name = rec.fields.Name?.[0] || primaryEmail?.split("@")[0] || "?";
      const roles = rec.fields["Wings Role"] || [];
      if (primaryEmail) results.set(primaryEmail.toLowerCase(), { email: primaryEmail, name, roles });
      if (altEmail && altEmail.toLowerCase().includes(q.toLowerCase()) && altEmail !== primaryEmail) {
        results.set(altEmail.toLowerCase(), { email: altEmail, name, roles });
      }
    }
  }

  if (instructorRes.ok) {
    const data: { records: InstructorRecord[] } = await instructorRes.json();
    for (const rec of data.records) {
      const email = rec.fields.Email;
      if (!email) continue;
      const name = rec.fields.Name || email.split("@")[0];
      const roles = rec.fields["All Roles"]
        ? rec.fields["All Roles"].split(",").map((r) => r.trim()).filter(Boolean)
        : [];
      const key = email.toLowerCase();
      const existing = results.get(key);
      if (existing) {
        existing.roles = [...new Set([...existing.roles, ...roles])];
      } else {
        results.set(key, { email, name, roles });
      }
    }
  }

  return [...results.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ── Public API (unchanged exports) ──

export async function getUserData(email: string): Promise<AirtableUserData> {
  const source = useGateway ? "Gateway" : "Direct";
  console.log(`[Airtable/${source}] Looking up: ${email}`);

  try {
    const result = useGateway
      ? await getUserDataViaGateway(email)
      : await getUserDataDirect(email);
    console.log(`[Airtable/${source}] ${email}: roles=[${result.roles}], wingsUserId=${result.wingsUserId}`);
    return result;
  } catch (error) {
    console.error(`[Airtable/${source}] Failed:`, error);
    return { roles: [], wingsUserId: null, name: null };
  }
}

export async function getUserRoles(email: string): Promise<string[]> {
  const data = await getUserData(email);
  return data.roles;
}

export async function searchCustomers(query: string): Promise<AirtableCustomerSummary[]> {
  return useGateway
    ? searchCustomersViaGateway(query)
    : searchCustomersDirect(query);
}
