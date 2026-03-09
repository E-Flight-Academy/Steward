// Airtable integration for Wings roles

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";

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

interface AirtableResponse {
  records: AirtableRecord[];
}

interface InstructorResponse {
  records: InstructorRecord[];
}

export interface AirtableUserData {
  roles: string[];
  wingsUserId: number | null;
}

/**
 * Look up user in Customers table by email
 */
async function queryCustomers(email: string): Promise<AirtableUserData> {
  const safeEmail = email.replace(/"/g, '\\"');
  const formula = `OR(LOWER({Client E-Mail}) = LOWER("${safeEmail}"), LOWER({E-Mail 2}) = LOWER("${safeEmail}"))`;
  const fields = ["Wings Role", "Client E-Mail", "Wings User ID", "E-Mail 2", "Wings User ID 2"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent("Customers")}?filterByFormula=${encodeURIComponent(formula)}&${fields}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) return { roles: [], wingsUserId: null };

  const data: AirtableResponse = await response.json();
  if (data.records.length === 0) return { roles: [], wingsUserId: null };

  const record = data.records[0].fields;
  const roles = record["Wings Role"] || [];
  const matchedViaAlt = record["E-Mail 2"]?.toLowerCase() === email.toLowerCase();
  const wingsUserId = matchedViaAlt
    ? (record["Wings User ID 2"] ?? record["Wings User ID"] ?? null)
    : (record["Wings User ID"] ?? null);
  return { roles, wingsUserId };
}

/**
 * Look up user in Instructors table by email
 */
async function queryInstructors(email: string): Promise<AirtableUserData> {
  const safeEmail = email.replace(/"/g, '\\"');
  const formula = `LOWER({Email}) = LOWER("${safeEmail}")`;
  const fields = ["Email", "Wings ID", "All Roles"].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent("Instructors")}?filterByFormula=${encodeURIComponent(formula)}&${fields}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) return { roles: [], wingsUserId: null };

  const data: InstructorResponse = await response.json();
  if (data.records.length === 0) return { roles: [], wingsUserId: null };

  const record = data.records[0].fields;
  const roles = record["All Roles"]
    ? record["All Roles"].split(",").map((r) => r.trim()).filter(Boolean)
    : [];
  const wingsUserId = record["Wings ID"] ?? null;
  return { roles, wingsUserId };
}

/**
 * Fetch user data (roles + Wings User ID) from both Customers and Instructors tables.
 * Merges roles from both, preferring the Wings User ID from whichever table has one.
 */
export async function getUserData(email: string): Promise<AirtableUserData> {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn("Airtable not configured");
    return { roles: [], wingsUserId: null };
  }

  try {
    console.log(`[Airtable] Looking up email: ${email}`);
    const [customerData, instructorData] = await Promise.all([
      queryCustomers(email),
      queryInstructors(email),
    ]);

    // Merge roles (deduplicated)
    const allRoles = [...new Set([...customerData.roles, ...instructorData.roles])];
    // Prefer customer wingsUserId, fall back to instructor
    const wingsUserId = customerData.wingsUserId ?? instructorData.wingsUserId;

    const sources = [
      customerData.roles.length > 0 ? "Customers" : null,
      instructorData.roles.length > 0 ? "Instructors" : null,
    ].filter(Boolean);
    console.log(`[Airtable] ${email}: roles=[${allRoles.join(", ")}], wingsUserId=${wingsUserId}, sources=[${sources.join(", ")}]`);

    return { roles: allRoles, wingsUserId };
  } catch (error) {
    console.error("Failed to fetch data from Airtable:", error);
    return { roles: [], wingsUserId: null };
  }
}

/**
 * Fetch user roles from Airtable by email address
 */
export async function getUserRoles(email: string): Promise<string[]> {
  const data = await getUserData(email);
  return data.roles;
}

export interface AirtableCustomerSummary {
  email: string;
  name: string;
  roles: string[];
}

/**
 * Search customers and instructors in Airtable by name or email (for admin user picker)
 */
export async function searchCustomers(query: string): Promise<AirtableCustomerSummary[]> {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    throw new Error(`Airtable not configured: token=${!!AIRTABLE_TOKEN}, base=${!!AIRTABLE_BASE_ID}`);
  }

  const q = query.replace(/"/g, '\\"');

  // Query both tables in parallel
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

  // Process customers
  if (customerRes.ok) {
    const data = await customerRes.json();
    for (const rec of data.records) {
      const primaryEmail = rec.fields["Client E-Mail"];
      const altEmail = rec.fields["E-Mail 2"];
      const name = rec.fields.Name?.[0] || primaryEmail?.split("@")[0] || "?";
      const roles = rec.fields["Wings Role"] || [];

      if (primaryEmail) {
        results.set(primaryEmail.toLowerCase(), { email: primaryEmail, name, roles });
      }
      if (altEmail && altEmail.toLowerCase().includes(q.toLowerCase()) && altEmail !== primaryEmail) {
        results.set(altEmail.toLowerCase(), { email: altEmail, name, roles });
      }
    }
  }

  // Process instructors — merge with existing or add new
  if (instructorRes.ok) {
    const data: InstructorResponse = await instructorRes.json();
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
        // Merge roles
        existing.roles = [...new Set([...existing.roles, ...roles])];
      } else {
        results.set(key, { email, name, roles });
      }
    }
  }

  return [...results.values()].sort((a, b) => a.name.localeCompare(b.name));
}
