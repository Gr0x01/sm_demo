const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Shift a hex color lighter (positive amount) or darker (negative). */
export function shiftHex(hex: string, amount: number): string {
  if (!HEX_RE.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const shift = (c: number) =>
    Math.min(
      255,
      Math.max(0, Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount)))
    );
  return `#${shift(r).toString(16).padStart(2, "0")}${shift(g).toString(16).padStart(2, "0")}${shift(b).toString(16).padStart(2, "0")}`;
}
