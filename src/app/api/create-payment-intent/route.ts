import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";

type Payload = {
  amount: number;
  side: "left" | "right";
  customerId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Payload>;
  const amount = Number(body.amount);
  const side = body.side;
  const requestedCustomerId = body.customerId;

  if (!side || !["left", "right"].includes(side)) {
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  let customerId = requestedCustomerId;

  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      customerId = undefined;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create();
    customerId = customer.id;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    customer: customerId,
    setup_future_usage: "off_session",
    metadata: { side },
  });

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2024-06-20" }
  );

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    customerId,
    ephemeralKey: ephemeralKey.secret,
  });
}
