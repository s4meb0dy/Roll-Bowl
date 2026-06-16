/** Server-only admin PIN — set `ADMIN_PIN` in Vercel env (Production). */
export function getAdminPin(): string {
  return process.env.ADMIN_PIN?.trim() || "4355";
}

export function verifyAdminPin(pin: string): boolean {
  const expected = getAdminPin();
  if (!pin || pin.length > 12) return false;
  return pin === expected;
}
