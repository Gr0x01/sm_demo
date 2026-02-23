/** Type-safe parsers for branding columns (DB returns string, we need union types). */

export type LogoType = "icon" | "wordmark";
export type HeaderStyle = "light" | "dark";
export type CornerStyle = "sharp" | "rounded";

export function parseLogoType(val: string | null | undefined): LogoType {
  return val === "wordmark" ? "wordmark" : "icon";
}

export function parseHeaderStyle(val: string | null | undefined): HeaderStyle {
  return val === "light" ? "light" : "dark";
}

export function parseCornerStyle(val: string | null | undefined): CornerStyle {
  return val === "rounded" ? "rounded" : "sharp";
}
