/** Short unique id for orders and Stripe payment intents. */
export function generateOrderId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
