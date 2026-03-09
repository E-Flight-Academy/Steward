import { logger } from "./logger";

const SHOPIFY_STORE = "e-flight-academy.myshopify.com";
const SHOPIFY_SHOP_ID = "gid://shopify/Shop/53340078258";

async function getAdminToken(): Promise<string> {
  const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SHOPIFY_ADMIN_CLIENT_ID or SHOPIFY_ADMIN_CLIENT_SECRET not configured");
  }

  const resp = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) throw new Error(`Shopify OAuth failed: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

interface FaqSection {
  slug: string;
  section: string;
  questions: { q: string; a: string }[];
}

/**
 * Push FAQ JSON metafields to Shopify.
 * Expects grouped format: [{slug, section, questions: [{q, a}]}]
 */
export async function pushFaqMetafields(
  nl: FaqSection[],
  en: FaqSection[],
  de: FaqSection[],
): Promise<void> {
  const token = await getAdminToken();

  const mutation = `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message }
    }
  }`;

  const metafields = [
    { namespace: "eflight", key: "dynamicfaq_json_nl", ownerId: SHOPIFY_SHOP_ID, type: "json", value: JSON.stringify(nl) },
    { namespace: "eflight", key: "dynamicfaq_json_en", ownerId: SHOPIFY_SHOP_ID, type: "json", value: JSON.stringify(en) },
    { namespace: "eflight", key: "dynamicfaq_json_de", ownerId: SHOPIFY_SHOP_ID, type: "json", value: JSON.stringify(de) },
  ];

  const resp = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query: mutation, variables: { metafields } }),
  });

  if (!resp.ok) throw new Error(`Shopify GraphQL failed: ${resp.status}`);
  const result = await resp.json();
  const errors = result.data?.metafieldsSet?.userErrors;
  if (errors?.length > 0) {
    throw new Error(`Shopify userErrors: ${JSON.stringify(errors)}`);
  }
  logger.info("FAQ metafields pushed to Shopify", {
    nl: nl.reduce((n, s) => n + s.questions.length, 0),
    en: en.reduce((n, s) => n + s.questions.length, 0),
    de: de.reduce((n, s) => n + s.questions.length, 0),
  });
}
