"use client";

import * as React from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FaceSlider } from "@/components/face-slider";
import { cn } from "@/lib/utils";

type Side = "left" | "right";

type Totals = {
  left: number;
  right: number;
  lastUpdated: number;
};

type SavedMethod = {
  hasSavedMethod: boolean;
  brand?: string;
  last4?: string;
};

const stripePromise: Promise<Stripe | null> | null =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

const amountOptions = [
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
  { label: "$25", value: 2500 },
  { label: "$50", value: 5000 },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const detailFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatAmount(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatDetailAmount(cents: number) {
  return detailFormatter.format(cents / 100);
}

async function fetchTotals(): Promise<Totals> {
  const response = await fetch("/api/totals", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch totals");
  }
  return response.json();
}

async function recordPayment(paymentIntentId: string, side: Side) {
  const response = await fetch("/api/record-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId, side }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to record payment");
  }

  return response.json() as Promise<Totals>;
}

async function fetchSavedMethod(customerId: string): Promise<SavedMethod> {
  const response = await fetch(
    `/api/saved-payment?customerId=${encodeURIComponent(customerId)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return { hasSavedMethod: false };
  }

  return response.json();
}

async function payWithSavedMethod(
  amount: number,
  side: Side,
  customerId: string
): Promise<Totals> {
  const response = await fetch("/api/pay-with-saved-method", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, side, customerId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to use saved payment method");
  }

  return response.json() as Promise<Totals>;
}

type CheckoutFormProps = {
  side: Side;
  amount: number;
  onPaid: (totals: Totals) => void;
  onCancel: () => void;
};

function CheckoutForm({ side, amount, onPaid, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setStatus(error.message ?? "Payment failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setStatus("Payment is still processing. Check back in a moment.");
      setIsSubmitting(false);
      return;
    }

    try {
      const updatedTotals = await recordPayment(paymentIntent.id, side);
      onPaid(updatedTotals);
      setStatus("Payment confirmed. Thanks for pushing the slider!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Payment record failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={!stripe || !elements || isSubmitting}>
          Pay {formatDetailAmount(amount)} to push {side === "left" ? "left" : "right"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Change amount
        </Button>
      </div>
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </form>
  );
}

export function FundingSlider() {
  const [totals, setTotals] = React.useState<Totals>({
    left: 0,
    right: 0,
    lastUpdated: Date.now(),
  });
  const [selectedSide, setSelectedSide] = React.useState<Side>("left");
  const [selectedAmount, setSelectedAmount] = React.useState(amountOptions[1].value);
  const [customAmount, setCustomAmount] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [ephemeralKey, setEphemeralKey] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [savedMethod, setSavedMethod] = React.useState<SavedMethod>({
    hasSavedMethod: false,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedCustomerId = window.localStorage.getItem("stripeCustomerId");
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
    }
  }, []);

  React.useEffect(() => {
    if (!customerId) {
      setSavedMethod({ hasSavedMethod: false });
      return;
    }

    let isMounted = true;

    const loadSavedMethod = async () => {
      const result = await fetchSavedMethod(customerId);
      if (isMounted) {
        setSavedMethod(result);
      }
    };

    loadSavedMethod();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  React.useEffect(() => {
    let isMounted = true;

    const loadTotals = async () => {
      try {
        const latestTotals = await fetchTotals();
        if (isMounted) {
          setTotals(latestTotals);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load totals right now.");
        }
      }
    };

    loadTotals();
    const interval = setInterval(loadTotals, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    setClientSecret(null);
    setEphemeralKey(null);
    setError(null);
  }, [selectedSide, selectedAmount, customAmount]);

  const parsedCustom = Number.parseFloat(customAmount);
  const customCents = Number.isFinite(parsedCustom) ? Math.round(parsedCustom * 100) : 0;
  const amount = customAmount.trim().length > 0 ? customCents : selectedAmount;
  const minimumAmount = 100;

  const total = totals.left + totals.right;
  const rightRatio = total > 0 ? totals.right / total : 0.5;
  const sliderValue = Math.round(rightRatio * 100);
  const face =
    totals.left === totals.right
      ? "neutral"
      : totals.right > totals.left
        ? "mamdani"
        : "trump";
  const leaderText =
    totals.left === totals.right
      ? "It is a tie."
      : totals.right > totals.left
        ? "Democrats are leading."
        : "Republicans are leading.";

  const handleStartPayment = async () => {
    if (!stripePromise) {
      setError("Missing Stripe publishable key.");
      return;
    }

    if (!Number.isFinite(amount) || amount < minimumAmount) {
      setError("Choose an amount of at least $1.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, side: selectedSide, customerId }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to create payment intent");
      }

      const result = (await response.json()) as {
        clientSecret: string;
        customerId: string;
        ephemeralKey: string;
      };
      setClientSecret(result.clientSecret);
      setEphemeralKey(result.ephemeralKey);
      setCustomerId(result.customerId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("stripeCustomerId", result.customerId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment setup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaid = (updatedTotals: Totals) => {
    setTotals(updatedTotals);
    setClientSecret(null);
    setCustomAmount("");
    if (customerId) {
      fetchSavedMethod(customerId).then(setSavedMethod).catch(() => null);
    }
  };

  const handleSavedPayment = async () => {
    if (!customerId) {
      setError("Saved payment method is unavailable.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedTotals = await payWithSavedMethod(
        amount,
        selectedSide,
        customerId
      );
      setTotals(updatedTotals);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Saved payment could not be used."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-zinc-200">
      <CardHeader className="space-y-2">
        <CardTitle>Power the slider</CardTitle>
        <CardDescription>
          Choose a side and fund the pull. The slider updates when payments
          succeed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <FaceSlider value={sliderValue} face={face} />
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
            <span className="text-red-500">Republicans</span>
            <span className="text-blue-500">Democrats</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Current balance
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-red-100 bg-red-50/60 p-4">
                  <p className="text-xs font-semibold text-red-600">
                    Republicans
                  </p>
                  <p className="text-2xl font-semibold text-zinc-900">
                    {formatAmount(totals.left)}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-semibold text-blue-600">
                    Democrats
                  </p>
                  <p className="text-2xl font-semibold text-zinc-900">
                    {formatAmount(totals.right)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-600">{leaderText}</p>
              <p className="mt-1 text-xs text-zinc-400">
                Updated {new Date(totals.lastUpdated).toLocaleTimeString()}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Pick a side
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={selectedSide === "left" ? "default" : "outline"}
                  className={cn(
                    selectedSide === "left" && "bg-red-600 hover:bg-red-500"
                  )}
                  onClick={() => setSelectedSide("left")}
                >
                  Push left
                </Button>
                <Button
                  type="button"
                  variant={selectedSide === "right" ? "default" : "outline"}
                  className={cn(
                    selectedSide === "right" && "bg-blue-600 hover:bg-blue-500"
                  )}
                  onClick={() => setSelectedSide("right")}
                >
                  Push right
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Choose amount
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {amountOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedAmount === option.value ? "default" : "outline"}
                    onClick={() => {
                      setSelectedAmount(option.value);
                      setCustomAmount("");
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Custom amount
                </label>
                <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2">
                  <span className="text-sm text-zinc-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.5"
                    placeholder="15"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
                <span>
                  You will push {selectedSide === "left" ? "left" : "right"}
                </span>
                <span className="font-semibold">{formatDetailAmount(amount)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Payment
              </p>
              <div className="mt-4 space-y-4">
                {!stripePromise ? (
                  <p className="text-sm text-zinc-600">
                    Add your Stripe publishable key to enable payments.
                  </p>
                ) : clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: { theme: "stripe" },
                      customerOptions: {
                        customer: customerId ? customerId : "",
                        ephemeralKey: ephemeralKey ? ephemeralKey : "",
                      },
                    }}
                  >
                    <CheckoutForm
                      side={selectedSide}
                      amount={amount}
                      onPaid={handlePaid}
                      onCancel={() => setClientSecret(null)}
                    />
                  </Elements>
                ) : (
                  <div className="space-y-3">
                    {savedMethod.hasSavedMethod ? (
                      <Button
                        type="button"
                        onClick={handleSavedPayment}
                        disabled={isLoading}
                      >
                        {isLoading
                          ? "Charging saved card..."
                          : `Pay with saved ${savedMethod.brand ?? "card"} ${
                              savedMethod.last4 ? `•••• ${savedMethod.last4}` : ""
                            }`}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant={savedMethod.hasSavedMethod ? "outline" : "default"}
                      onClick={handleStartPayment}
                      disabled={isLoading}
                    >
                      {isLoading ? "Starting checkout..." : "Continue to payment"}
                    </Button>
                  </div>
                )}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
