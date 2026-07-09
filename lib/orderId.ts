/** Short unique id for orders and Stripe payment intents. */
export function generateOrderId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

/** Base-36 alphabet used for the short, spoken-aloud order code. */
const CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 3;

/**
 * Short, human-friendly order code (max 3 characters) derived deterministically
 * from the full order id. Orders are handed over in the shop and customers
 * sometimes read the number out loud, so the long random id is folded down to a
 * fixed 3-char code. The same id always maps to the same code, so the receipt,
 * the customer confirmation and the kitchen board all show an identical number.
 */
export function shortOrderCode(orderId: string): string {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  const space = CODE_ALPHABET.length ** CODE_LENGTH;
  let n = hash % space;
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = CODE_ALPHABET[n % CODE_ALPHABET.length] + code;
    n = Math.floor(n / CODE_ALPHABET.length);
  }
  return code;
}
