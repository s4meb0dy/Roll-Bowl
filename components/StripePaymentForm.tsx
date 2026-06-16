"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { AlertCircle, Loader2 } from "lucide-react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const appearance: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#8a9a5b",
    borderRadius: "12px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

export function isStripePublishableConfigured(): boolean {
  return Boolean(publishableKey);
}

export type StripePaymentHandle = {
  confirmPayment: (returnUrl: string) => Promise<{
    ok: boolean;
    paymentIntentId?: string;
    error?: string;
  }>;
  ready: boolean;
};

const PaymentFields = forwardRef<
  StripePaymentHandle,
  { disabled?: boolean; onReady?: () => void }
>(function PaymentFields({ disabled, onReady }, ref) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      ready: Boolean(stripe && elements && ready),
      confirmPayment: async (returnUrl: string) => {
        if (!stripe || !elements) {
          return { ok: false, error: "Stripe niet geladen" };
        }
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        });
        if (error) {
          return { ok: false, error: error.message ?? "Betaling mislukt" };
        }
        if (paymentIntent?.status === "succeeded") {
          return { ok: true, paymentIntentId: paymentIntent.id };
        }
        return { ok: false, error: "Betaling niet voltooid" };
      },
    }),
    [stripe, elements, ready]
  );

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <PaymentElement
        options={{ layout: "tabs", readOnly: Boolean(disabled) }}
        onReady={() => {
          setReady(true);
          onReady?.();
        }}
      />
    </div>
  );
});

export const StripePaymentSection = forwardRef<
  StripePaymentHandle,
  {
    clientSecret: string | null;
    loading?: boolean;
    errorMessage?: string | null;
    disabled?: boolean;
    onReady?: () => void;
  }
>(function StripePaymentSection(
  { clientSecret, loading, errorMessage, disabled, onReady },
  ref
) {
  if (!stripePromise) {
    return (
      <div className="flex items-start gap-2 rounded-xl2 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
        <span>Online betalen is tijdelijk niet beschikbaar.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-500">
        <Loader2 size={18} className="animate-spin text-sage-500" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-start gap-2 rounded-xl2 bg-red-50 px-3 py-2.5 text-xs text-red-600">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        locale: "nl",
      }}
    >
      <div className="rounded-xl2 border border-ink-100 bg-white p-3">
        <PaymentFields ref={ref} disabled={disabled} onReady={onReady} />
      </div>
    </Elements>
  );
});

/** @deprecated Use StripePaymentSection */
export function StripePaymentForm(props: {
  clientSecret: string | null;
  loading?: boolean;
  errorMessage?: string | null;
}) {
  return <StripePaymentSection {...props} />;
}
