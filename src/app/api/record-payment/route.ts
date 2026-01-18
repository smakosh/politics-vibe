import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { addToTotals } from "@/lib/totals";

type Payload = {
  paymentIntentId: string;
  side: "left" | "right";
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Payload>;
  const paymentIntentId = body.paymentIntentId;
  const side = body.side;

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "Missing payment intent id" },
      { status: 400 }
    );
  }

  if (!side || !["left", "right"].includes(side)) {
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: "Payment not completed" },
      { status: 409 }
    );
  }

  if (paymentIntent.metadata.side && paymentIntent.metadata.side !== side) {
    return NextResponse.json(
      { error: "Payment side mismatch" },
      { status: 409 }
    );
  }

  if (paymentIntent.customer && paymentIntent.payment_method) {
    try {
      await stripe.customers.update(String(paymentIntent.customer), {
        invoice_settings: {
          default_payment_method: String(paymentIntent.payment_method),
        },
      });
    } catch {
      // Non-fatal: payment succeeded, totals can still update.
    }
  }

  const updatedTotals = addToTotals(side, paymentIntent.amount);

  return NextResponse.json(updatedTotals);
}
