import { inngest } from "@/inngest/client";
import { sendPilotInterestEmail } from "@/lib/email";
import { captureEvent } from "@/lib/posthog-server";

export const notifyPilotLead = inngest.createFunction(
  {
    id: "notify-pilot-lead",
    retries: 3,
  },
  { event: "pilot/lead.received" },
  async ({ event, step }) => {
    const { name, company, email, phone } = event.data;
    const lead = { name, company, email, phone };

    // Track in PostHog first — this must always succeed regardless of email
    await step.run("track-posthog", async () => {
      await captureEvent(email, "pilot_lead_submitted", {
        ...lead,
        source: "pilot_form",
      });
    });

    // Email with retries — if Resend is down, Inngest retries up to 3x
    await step.run("send-email", async () => {
      await sendPilotInterestEmail({ name, company, email, phone: phone || undefined });
    });

    return { notified: true };
  },
);
