// Branded HTML email templates for Finch.
// Pure functions returning { html, text } — no dependencies.

const DEFAULT_PRIMARY = "#1b2d4e";
const DEFAULT_SECONDARY = "#2767b1";
const PAGE_BG = "#eef2f7";
const CARD_BG = "#ffffff";
const BORDER = "#dce4ee";
const TEXT_HEADING = "#1f2d44";
const TEXT_BODY = "#334155";
const TEXT_MUTED = "#64748b";
const HEADING_FONT = "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", Helvetica, Arial, sans-serif";
const BODY_FONT = "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", Helvetica, Arial, sans-serif";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHexColor(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
}

interface BrandOptions {
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

function resolveBrand({ primaryColor, secondaryColor }: BrandOptions): { primary: string; secondary: string } {
  return {
    primary: safeHexColor(primaryColor, DEFAULT_PRIMARY),
    secondary: safeHexColor(secondaryColor, DEFAULT_SECONDARY),
  };
}

interface LayoutOptions extends BrandOptions {
  preheader?: string;
  orgName?: string;
  content: string;
}

function wrapLayout({
  preheader = "",
  orgName,
  primaryColor,
  secondaryColor,
  content,
}: LayoutOptions): string {
  const footerName = esc(orgName ?? "Finch");
  const brand = resolveBrand({ primaryColor, secondaryColor });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Finch</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:${BODY_FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};">
<tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;border:1px solid ${BORDER};background-color:${CARD_BG};overflow:hidden;box-shadow:0 10px 30px rgba(15, 23, 42, 0.06);">

<tr><td style="padding:0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:18px 0 14px 0;">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="padding-right:10px;"><span style="display:inline-block;width:18px;height:4px;background-color:${brand.primary};"></span></td>
<td><div style="font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_HEADING};">${footerName}</div></td>
</tr>
</table>
</td>
<td align="right" style="padding:18px 0 14px 0;">
<div style="font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${TEXT_MUTED};">Finch</div>
</td>
</tr>
</table>
</td></tr><tr><td style="height:1px;background-color:${BORDER};font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td style="padding:30px 28px 28px 28px;color:${TEXT_BODY};font-size:16px;line-height:1.65;">
${content}
</td></tr>

<tr><td style="padding:18px 28px 24px 28px;border-top:1px solid ${BORDER};background-color:#f8fafc;">
<p style="margin:0 0 6px 0;font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_MUTED};">${footerName}</p>
<p style="margin:0;font-family:${BODY_FONT};font-size:12px;color:${TEXT_MUTED};">hello@withfin.ch</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function microLabel(text: string, color: string): string {
  return `<p style="margin:0 0 12px 0;font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${color};">${esc(text)}</p>`;
}

function serifHeading(text: string, color: string = TEXT_HEADING): string {
  return `<h1 style="margin:0 0 14px 0;font-family:${HEADING_FONT};font-size:36px;line-height:1.12;font-weight:700;letter-spacing:-0.02em;color:${color};">${esc(text)}</h1>`;
}

function ctaButton(label: string, url: string, bgColor: string): string {
  const safeUrl = esc(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
<tr><td style="background-color:${bgColor};text-align:center;">
<a href="${safeUrl}" target="_blank" style="display:block;background-color:${bgColor};color:#ffffff !important;font-family:${BODY_FONT};font-size:14px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;line-height:1;padding:13px 22px;">
<span style="color:#ffffff !important;text-decoration:none;">${esc(label)}</span>
</a>
</td></tr>
</table>`;
}

function fallbackLink(url: string): string {
  const safeUrl = esc(url);
  return `<p style="margin:0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${TEXT_MUTED};word-break:break-all;">Or paste this link into your browser: <a href="${safeUrl}" style="color:${TEXT_MUTED};">${safeUrl}</a></p>`;
}

function infoCard(content: string, accentColor: string): string {
  void accentColor;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0 0;border:1px solid ${BORDER};background-color:#f8fafc;">
<tr><td style="padding:14px 14px 12px 14px;">
${content}
</td></tr>
</table>`;
}

// ---------------------------------------------------------------------------
// 1. Buyer Resume Email
// ---------------------------------------------------------------------------

interface BuyerResumeProps {
  floorplanName: string;
  resumeLink: string;
  orgName: string;
  orgPrimaryColor?: string | null;
  orgSecondaryColor?: string | null;
}

export function buyerResumeEmail({
  floorplanName,
  resumeLink,
  orgName,
  orgPrimaryColor,
  orgSecondaryColor,
}: BuyerResumeProps): { html: string; text: string } {
  const brand = resolveBrand({ primaryColor: orgPrimaryColor, secondaryColor: orgSecondaryColor });

  const content = [
    microLabel("Saved Selections", brand.secondary),
    serifHeading(`Your ${floorplanName} selections are saved`),
    `<p style="margin:0;">Pick up right where you left off. Your latest choices are ready whenever you are.</p>`,
    infoCard(
      `<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_MUTED};">Design Link</p>
<p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.45;color:${TEXT_BODY};">Open your saved ${esc(floorplanName)} design and continue editing or reviewing your upgrade selections.</p>`
    , brand.secondary),
    ctaButton("Resume Design", resumeLink, brand.primary),
    fallbackLink(resumeLink),
  ].join("\n");

  const html = wrapLayout({
    preheader: `Your ${floorplanName} selections are saved.`,
    orgName,
    primaryColor: brand.primary,
    secondaryColor: brand.secondary,
    content,
  });

  const text = [
    "SAVED SELECTIONS",
    "",
    `Your ${floorplanName} selections are saved.`,
    "Pick up right where you left off. Your latest choices are ready whenever you are.",
    "",
    "Resume your design:",
    resumeLink,
    "",
    `— ${orgName}`,
    "hello@withfin.ch",
  ].join("\n");

  return { html, text };
}

// ---------------------------------------------------------------------------
// 2. Admin Invite Email
// ---------------------------------------------------------------------------

interface AdminInviteProps {
  orgName: string;
  role: string;
  loginLink: string;
  orgPrimaryColor?: string | null;
  orgSecondaryColor?: string | null;
}

// ---------------------------------------------------------------------------
// 3. Pilot Interest Notification (internal)
// ---------------------------------------------------------------------------

interface PilotInterestProps {
  name: string;
  company: string;
  email: string;
  phone?: string;
}

export function pilotInterestNotification({
  name,
  company,
  email,
  phone,
}: PilotInterestProps): { html: string; text: string } {
  const content = [
    microLabel("New Pilot Interest", DEFAULT_SECONDARY),
    serifHeading("New lead from the website"),
    infoCard(
      `<p style="margin:0 0 6px 0;font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_MUTED};">Contact Details</p>
<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:14px;color:${TEXT_BODY};"><strong style="color:${TEXT_HEADING};">Name:</strong> ${esc(name)}</p>
<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:14px;color:${TEXT_BODY};"><strong style="color:${TEXT_HEADING};">Company:</strong> ${esc(company)}</p>
<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:14px;color:${TEXT_BODY};"><strong style="color:${TEXT_HEADING};">Email:</strong> <a href="mailto:${esc(email)}" style="color:${DEFAULT_SECONDARY};">${esc(email)}</a></p>
${phone ? `<p style="margin:0;font-family:${BODY_FONT};font-size:14px;color:${TEXT_BODY};"><strong style="color:${TEXT_HEADING};">Phone:</strong> ${esc(phone)}</p>` : ""}`,
      DEFAULT_SECONDARY
    ),
    ctaButton("Reply to Lead", `mailto:${esc(email)}`, DEFAULT_PRIMARY),
  ].join("\n");

  const html = wrapLayout({
    preheader: `Pilot interest from ${company}`,
    content,
  });

  const text = [
    "NEW PILOT INTEREST",
    "",
    `Name: ${name}`,
    `Company: ${company}`,
    `Email: ${email}`,
    ...(phone ? [`Phone: ${phone}`] : []),
    "",
    `Reply: mailto:${email}`,
  ].join("\n");

  return { html, text };
}

export function adminInviteEmail({
  orgName,
  role,
  loginLink,
  orgPrimaryColor,
  orgSecondaryColor,
}: AdminInviteProps): { html: string; text: string } {
  const brand = resolveBrand({ primaryColor: orgPrimaryColor, secondaryColor: orgSecondaryColor });
  const roleLabel = role === "admin" ? "Admin" : "Viewer";
  const roleDescription =
    role === "admin"
      ? "You can manage floorplans, pricing, and team members."
      : "You have read-only access to floorplans and buyer selections.";

  const content = [
    microLabel("Team Invite", brand.secondary),
    serifHeading(`You're invited to ${orgName}`),
    `<p style="margin:0;">${esc(roleDescription)}</p>`,
    infoCard(
      `<p style="margin:0 0 6px 0;font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_MUTED};">Access Details</p>
<p style="margin:0 0 4px 0;font-family:${BODY_FONT};font-size:14px;color:${TEXT_BODY};"><strong style="color:${TEXT_HEADING};">Organization:</strong> ${esc(orgName)}</p>
<p style="margin:0;font-family:${BODY_FONT};font-size:14px;color:${TEXT_BODY};"><strong style="color:${TEXT_HEADING};">Role:</strong> ${esc(roleLabel)}</p>`
    , brand.secondary),
    ctaButton("Sign In To Finch", loginLink, brand.primary),
    fallbackLink(loginLink),
  ].join("\n");

  const html = wrapLayout({
    preheader: `You've been invited to ${orgName} on Finch.`,
    orgName,
    primaryColor: brand.primary,
    secondaryColor: brand.secondary,
    content,
  });

  const text = [
    "TEAM INVITE",
    "",
    `You're invited to ${orgName}.`,
    `Role: ${roleLabel}`,
    roleDescription,
    "",
    "Sign in to get started:",
    loginLink,
    "",
    `— ${orgName}`,
    "hello@withfin.ch",
  ].join("\n");

  return { html, text };
}
