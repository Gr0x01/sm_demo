#!/usr/bin/env tsx
/**
 * Apollo CSV → Notion Contacts
 *
 * Takes an Apollo CSV export and creates Contact rows in Notion,
 * deduplicating against existing entries.
 *
 * Usage:
 *   npx tsx scripts/apollo-to-notion.ts --csv path/to/export.csv --campaign C3
 *   npx tsx scripts/apollo-to-notion.ts --csv path/to/export.csv --campaign C3 --dry-run
 *
 * One-time setup:
 *   1. Go to notion.so/my-integrations → New integration → name it "Apollo Sync"
 *   2. Copy the Internal Integration Secret
 *   3. Add to .env.local: NOTION_API_KEY=secret_xxx
 *   4. In Notion, open the Contacts database → ··· → Connections → Add "Apollo Sync"
 *
 * Supports both Apollo export format and custom CSV format:
 *   Apollo:  First Name, Last Name, Email, Title, Company, LinkedIn Url
 *   Custom:  contact_first, contact_last, email, contact_title, company_name
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

config({ path: resolve(import.meta.dirname ?? __dirname, "../.env.local") });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const CONTACTS_DB_ID = "d3d269c3b4b6450a8d871f1c406a5ca7";
const NOTION_BASE = "https://api.notion.com/v1";

if (!NOTION_API_KEY) {
  console.error(
    "Missing NOTION_API_KEY in .env.local\n" +
      "Setup: notion.so/my-integrations → New integration → copy secret"
  );
  process.exit(1);
}

// --- Args ---

const args = process.argv.slice(2);
const csvIndex = args.indexOf("--csv");
const campaignIndex = args.indexOf("--campaign");
const dryRun = args.includes("--dry-run");

if (csvIndex === -1 || !args[csvIndex + 1]) {
  console.error("Usage: npx tsx scripts/apollo-to-notion.ts --csv <path> --campaign <name> [--dry-run]");
  process.exit(1);
}

const csvPath = resolve(args[csvIndex + 1]);
const campaign = campaignIndex !== -1 ? args[campaignIndex + 1] || null : null;

if (campaignIndex !== -1 && !campaign) {
  console.error("--campaign requires a value (e.g. --campaign C3)");
  process.exit(1);
}

// --- CSV parsing ---

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (values[i] || "").trim()));
    return row;
  });
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// --- Normalize CSV row to contact ---

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  company: string;
  linkedin: string;
  phone: string;
}

function normalizeRow(row: Record<string, string>): Contact | null {
  // Support both Apollo export and custom CSV column names
  const firstName =
    row["First Name"] || row["contact_first"] || row["first_name"] || "";
  const lastName =
    row["Last Name"] || row["contact_last"] || row["last_name"] || "";

  if (!firstName && !lastName) return null;

  return {
    firstName,
    lastName,
    email:
      (row["Email"] || row["email"] || "").toLowerCase(),
    title:
      row["Title"] || row["contact_title"] || row["Contact Title"] || "",
    company:
      row["Company"] || row["company_name"] || "",
    linkedin:
      row["LinkedIn Url"] || row["LinkedIn"] || row["linkedin"] || "",
    phone:
      row["Phone"] || row["phone"] || row["Work Direct Phone"] || "",
  };
}

// --- Notion API helpers ---

async function notionFetch(path: string, body?: object) {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }

  return res.json();
}

async function getExistingContacts(): Promise<
  Map<string, { id: string; email: string }>
> {
  const existing = new Map<string, { id: string; email: string }>();
  let cursor: string | undefined;

  do {
    const query: Record<string, unknown> = { page_size: 100 };
    if (cursor) query.start_cursor = cursor;

    const res = await notionFetch(
      `/databases/${CONTACTS_DB_ID}/query`,
      query
    );

    for (const page of res.results) {
      const props = page.properties;
      const name = props.Name?.title?.[0]?.plain_text || "";
      const email = (props.Email?.email || "").toLowerCase();

      if (name) {
        existing.set(name.toLowerCase(), { id: page.id, email });
      }
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return existing;
}

function buildCreatePayload(contact: Contact, campaignTag: string | null) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: fullName } }] },
    "Contact Name": { rich_text: [{ text: { content: fullName } }] },
    Status: { select: { name: "Not Started" } },
    Channel: { multi_select: [{ name: "Email" }] },
  };

  if (contact.email) {
    properties.Email = { email: contact.email };
  }

  if (contact.title) {
    properties["Contact Title"] = {
      rich_text: [{ text: { content: contact.title } }],
    };
  }

  if (contact.linkedin) {
    properties.LinkedIn = { url: contact.linkedin };
  }

  if (contact.phone) {
    properties.Phone = { phone_number: contact.phone };
  }

  if (campaignTag) {
    properties.Campaign = { multi_select: [{ name: campaignTag }] };
  }

  // Company goes in Notes (not the Company relation, which requires a linked page ID)
  if (contact.company) {
    properties.Notes = {
      rich_text: [{ text: { content: contact.company } }],
    };
  }

  return {
    parent: { database_id: CONTACTS_DB_ID },
    properties,
  };
}

// --- Main ---

async function main() {
  console.log(`Reading ${csvPath}...`);
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(raw);
  console.log(`Parsed ${rows.length} rows from CSV`);

  if (campaign) console.log(`Campaign tag: ${campaign}`);
  if (dryRun) console.log("DRY RUN — no changes will be made\n");

  console.log("Fetching existing Notion contacts...");
  const existing = await getExistingContacts();
  console.log(`Found ${existing.size} existing contacts\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const contact = normalizeRow(row);
    if (!contact) {
      skipped++;
      continue;
    }

    const fullName = `${contact.firstName} ${contact.lastName}`.trim();
    const key = fullName.toLowerCase();

    // Dedup: check by name
    if (existing.has(key)) {
      const ex = existing.get(key)!;
      // If existing entry has no email but CSV does, note it
      if (!ex.email && contact.email) {
        console.log(
          `  SKIP (exists, but has no email — consider updating): ${fullName}`
        );
      } else {
        console.log(`  SKIP (exists): ${fullName}`);
      }
      skipped++;
      continue;
    }

    // Also dedup by email if present
    if (contact.email) {
      let emailMatch = false;
      for (const [name, data] of existing) {
        if (data.email === contact.email) {
          console.log(
            `  SKIP (email match → ${name}): ${fullName}`
          );
          emailMatch = true;
          break;
        }
      }
      if (emailMatch) {
        skipped++;
        continue;
      }
    }

    if (dryRun) {
      console.log(
        `  CREATE (dry run): ${fullName} — ${contact.email || "no email"} — ${contact.company}`
      );
      existing.set(key, { id: "dry", email: contact.email });
      created++;
      continue;
    }

    try {
      const payload = buildCreatePayload(contact, campaign);
      await notionFetch("/pages", payload);
      console.log(
        `  CREATED: ${fullName} — ${contact.email || "no email"} — ${contact.company}`
      );
      // Add to existing map so later rows dedup against earlier ones
      existing.set(key, { id: "new", email: contact.email });
      created++;
    } catch (err) {
      console.error(`  ERROR: ${fullName} — ${err}`);
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(
    `\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
