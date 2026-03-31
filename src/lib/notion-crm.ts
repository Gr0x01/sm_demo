import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DB_CONTACTS = process.env.NOTION_DB_CONTACTS!;
const DB_INTERACTIONS = process.env.NOTION_DB_INTERACTIONS!;

/**
 * Find a Contact page by email. Returns { pageId, companyId } or null.
 */
export async function findContactByEmail(
  email: string
): Promise<{ pageId: string; companyId: string | null } | null> {
  const res = await notion.dataSources.query({
    data_source_id: DB_CONTACTS,
    filter: {
      property: "Email",
      email: { equals: email.toLowerCase() },
    },
    page_size: 1,
  });

  if (res.results.length === 0) return null;

  const page = res.results[0];
  // Extract company relation if present
  let companyId: string | null = null;
  if ("properties" in page) {
    const companyProp = (page.properties as Record<string, unknown>)["Company"];
    if (
      companyProp &&
      typeof companyProp === "object" &&
      "relation" in (companyProp as Record<string, unknown>)
    ) {
      const relations = (companyProp as { relation: { id: string }[] })
        .relation;
      if (relations.length > 0) {
        companyId = relations[0].id;
      }
    }
  }

  return { pageId: page.id, companyId };
}

/**
 * Update a Contact's Status property.
 */
export async function updateContactStatus(
  pageId: string,
  status: string
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  });
}

/**
 * Create an Interaction row linked to a Contact and optionally a Company.
 */
export async function createInteraction(params: {
  summary: string;
  date: string;
  channel: string;
  direction: string;
  contactId: string;
  companyId?: string;
  notes?: string;
}): Promise<void> {
  const properties: Record<string, unknown> = {
    Summary: { title: [{ text: { content: params.summary } }] },
    Date: { date: { start: params.date.split("T")[0] } },
    Channel: { select: { name: params.channel } },
    Direction: { select: { name: params.direction } },
    Contact: { relation: [{ id: params.contactId }] },
  };

  if (params.companyId) {
    properties.Company = { relation: [{ id: params.companyId }] };
  }

  if (params.notes) {
    properties.Notes = {
      rich_text: [{ text: { content: params.notes.slice(0, 2000) } }],
    };
  }

  await notion.pages.create({
    parent: { database_id: DB_INTERACTIONS },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  } as Parameters<typeof notion.pages.create>[0]);
}
