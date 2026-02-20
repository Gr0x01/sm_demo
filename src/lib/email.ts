import { Resend } from "resend";

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
  floorplanName: string
) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error("[email] Missing RESEND_FROM_EMAIL env var");
    return;
  }

  await getResend().emails.send({
    from,
    to,
    subject: `Your ${orgName} selections are saved`,
    text: [
      `Your upgrade selections for the ${floorplanName} plan are saved.`,
      "",
      `Pick up where you left off:`,
      resumeLink,
      "",
      `— ${orgName}`,
    ].join("\n"),
  });
}
