import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { addToTotals } from "@/lib/totals";

type Payload = {
  amount: number;
  side: "left" | "right";
  customerId: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Payload>;
  const amount = Number(body.amount);
  const side = body.side;
  const customerId = body.customerId;

  if (!customerId) {
    return NextResponse.json(
      { error: "Missing customer id" },
      { status: 400 }
    );
  }

  if (!side || !["left", "right"].includes(side)) {
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const customer = await stripe.customers.retrieve(customerId);

  if (
    !customer ||
    customer.deleted ||
    !customer.invoice_settings?.default_payment_method
  ) {
    return NextResponse.json(
      { error: "No saved payment method" },
      { status: 404 }
    );
  }

  const paymentMethodId = String(
    customer.invoice_settings.default_payment_method
  );

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: { side },
    });

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment requires action" },
        { status: 409 }
      );
    }

    const updatedTotals = addToTotals(side, paymentIntent.amount);
    return NextResponse.json(updatedTotals);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment failed" },
      { status: 409 }
    );
  }
}
