import { Resend } from "resend";
import { buyerResumeEmail, adminInviteEmail, pilotInterestNotification } from "./email-templates";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendResumeEmail(
  to: string,
  resumeLink: string,
  orgName: string,
  floorplanName: string,
  orgPrimaryColor?: string | null,
  orgSecondaryColor?: string | null
) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error("[email] Missing RESEND_FROM_EMAIL env var");
    return;
  }

  const { html, text } = buyerResumeEmail({
    floorplanName,
    resumeLink,
    orgName,
    orgPrimaryColor,
    orgSecondaryColor,
  });

  await getResend().emails.send({
    from,
    to,
    subject: `Your ${orgName} selections are saved`,
    html,
    text,
  });
}

export async function sendAdminInviteEmail(
  to: string,
  loginLink: string,
  orgName: string,
  role: string,
  orgPrimaryColor?: string | null,
  orgSecondaryColor?: string | null
) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error("[email] Missing RESEND_FROM_EMAIL env var");
    return;
  }

  const { html, text } = adminInviteEmail({
    orgName,
    role,
    loginLink,
    orgPrimaryColor,
    orgSecondaryColor,
  });

  await getResend().emails.send({
    from,
    to,
    subject: `You've been invited to manage ${orgName} on Finch`,
    html,
    text,
  });
}

export async function sendPilotInterestEmail(lead: {
  name: string;
  company: string;
  email: string;
  phone?: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error("[email] Missing RESEND_FROM_EMAIL env var");
    return;
  }

  const { html, text } = pilotInterestNotification(lead);

  await getResend().emails.send({
    from,
    to: "hello@withfin.ch",
    replyTo: lead.email,
    subject: `Pilot interest: ${lead.company}`,
    html,
    text,
  });
}
