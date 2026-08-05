import type Stripe from "stripe";

/**
 * How far along a Payment Intent is, from the customer's point of view.
 *
 * `settling` matters for the redirect wallets we sell most with (Bancontact,
 * iDEAL): the bank sends the customer back with `redirect_status=succeeded`
 * while Stripe still reports `processing` for a few seconds. Treating that as
 * a failure showed paying customers "we couldn't confirm your order".
 */
export type PaymentSettleState = "paid" | "settling" | "failed";

export function classifyPaymentStatus(
  status: Stripe.PaymentIntent.Status
): PaymentSettleState {
  if (status === "succeeded" || status === "requires_capture") return "paid";
  if (status === "processing") return "settling";
  return "failed";
}

const POLL_ATTEMPTS = 3;
const POLL_DELAY_MS = 700;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retrieve a Payment Intent, giving Stripe a couple of seconds to move it out
 * of `processing`. Most redirect payments settle within the first retry, so
 * the common case still resolves in a single API call.
 */
export async function retrieveSettledPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string
): Promise<{ paymentIntent: Stripe.PaymentIntent; state: PaymentSettleState }> {
  let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  let state = classifyPaymentStatus(paymentIntent.status);

  for (let attempt = 1; attempt < POLL_ATTEMPTS && state === "settling"; attempt++) {
    await sleep(POLL_DELAY_MS);
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    state = classifyPaymentStatus(paymentIntent.status);
  }

  return { paymentIntent, state };
}
