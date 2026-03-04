import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeBaseStatus, getDocumentContext } from "@/lib/documents";
import { getSession } from "@/lib/shopify-auth";
import { getUserRoles } from "@/lib/airtable";
import { getFoldersForRoles } from "@/lib/role-access";
import { getConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const status = await getKnowledgeBaseStatus();

  // Fast path: skip user-specific data unless ?user=true (used by debug bar)
  const includeUser = request.nextUrl.searchParams.get("user") === "true";
  if (!includeUser || status.status !== "synced") {
    return NextResponse.json(status);
  }

  // Load config for search_order display in debug panel
  const config = await getConfig().catch(() => null);

  // Slow path: include user session, roles, filtered files
  let userEmail: string | null = null;
  let userRoles: string[] = [];
  let allowedFolders: string[] = ["public"];
  let filteredFileNames: string[] = status.fileNames;

  try {
    const session = await Promise.race([
      getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (session?.customer?.email) {
      userEmail = session.customer.email;
      userRoles = await getUserRoles(userEmail);
      allowedFolders = await getFoldersForRoles(userRoles);

      if (!allowedFolders.includes("*")) {
        const ctx = await getDocumentContext(allowedFolders);
        filteredFileNames = ctx.fileNames;
      }
    }
  } catch {
    // Not logged in
  }

  return NextResponse.json({
    ...status,
    searchOrder: config?.search_order ?? ["faq", "drive"],
    user: { email: userEmail, roles: userRoles, folders: allowedFolders },
    filteredFileCount: filteredFileNames.length,
    filteredFileNames,
  });
}
