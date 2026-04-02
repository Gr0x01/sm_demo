import { NextResponse } from "next/server";
import {
  fetchRepliesSince,
  fetchBouncedLeads,
  fetchLeadByEmail,
} from "@/lib/instantly";
import {
  findContactByEmail,
  updateContactStatus,
  createInteraction,
  createContactFromReply,
} from "@/lib/notion-crm";
import { getCursor, setCursor } from "@/lib/sync-cursors";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    replies_synced: 0,
    bounces_synced: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // --- REPLIES ---
  try {
    const lastPoll = await getCursor("instantly_replies_last_poll");
    const replies = await fetchRepliesSince(lastPoll);

    // Only advance cursor to the last *successfully* processed reply
    let lastSuccessTimestamp = lastPoll;

    for (const email of replies) {
      try {
        const leadEmail = email.lead || email.from_address_email;
        if (!leadEmail) continue;

        let contact = await findContactByEmail(leadEmail);

        if (!contact) {
          // Lead replied but isn't in Notion yet — create a stub contact
          const lead = await fetchLeadByEmail(leadEmail);
          const stub = await createContactFromReply({
            email: leadEmail,
            firstName: lead?.first_name,
            lastName: lead?.last_name,
            companyName: lead?.company_name,
          });
          contact = { pageId: stub.pageId, companyId: null };
        } else {
          await updateContactStatus(contact.pageId, "Replied");
        }

        await createInteraction({
          summary: `Reply: ${email.subject || "(no subject)"}`,
          date: email.timestamp_created,
          channel: "Email",
          direction: "Inbound",
          contactId: contact.pageId,
          companyId: contact.companyId ?? undefined,
          notes: email.body?.text?.slice(0, 2000),
        });

        results.replies_synced++;

        if (email.timestamp_created > lastSuccessTimestamp) {
          lastSuccessTimestamp = email.timestamp_created;
        }
      } catch (err) {
        // Don't advance cursor past failed items — they'll retry next poll
        results.errors.push(
          `Reply sync failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    if (lastSuccessTimestamp > lastPoll) {
      await setCursor("instantly_replies_last_poll", lastSuccessTimestamp);
    }
  } catch (err) {
    results.errors.push(
      `Replies fetch: ${err instanceof Error ? err.message : err}`
    );
  }

  // --- BOUNCES ---
  try {
    const cursor = await getCursor("instantly_bounces_cursor");
    const { leads, nextCursor } = await fetchBouncedLeads(
      cursor || undefined
    );

    for (const lead of leads) {
      try {
        const contact = await findContactByEmail(lead.email);
        if (!contact) {
          results.skipped++;
          continue;
        }

        await updateContactStatus(contact.pageId, "Bounced");

        await createInteraction({
          summary: "Email bounced",
          date: new Date().toISOString(),
          channel: "Email",
          direction: "Inbound",
          contactId: contact.pageId,
          companyId: contact.companyId ?? undefined,
        });

        results.bounces_synced++;
      } catch (err) {
        results.errors.push(
          `Bounce sync failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    if (nextCursor) {
      await setCursor("instantly_bounces_cursor", nextCursor);
    }
  } catch (err) {
    results.errors.push(
      `Bounces fetch: ${err instanceof Error ? err.message : err}`
    );
  }

  console.log("[instantly-sync]", JSON.stringify(results));

  return NextResponse.json(results, {
    status: results.errors.length > 0 ? 207 : 200,
  });
}
