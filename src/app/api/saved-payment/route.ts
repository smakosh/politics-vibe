import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { error: "Missing customer id" },
      { status: 400 }
    );
  }

  const customer = await stripe.customers.retrieve(customerId);

  if (
    !customer ||
    customer.deleted ||
    !customer.invoice_settings?.default_payment_method
  ) {
    return NextResponse.json({ hasSavedMethod: false });
  }

  const paymentMethodId = customer.invoice_settings.default_payment_method;
  const paymentMethod = await stripe.paymentMethods.retrieve(
    String(paymentMethodId)
  );

  if (paymentMethod.type !== "card" || !paymentMethod.card) {
    return NextResponse.json({ hasSavedMethod: false });
  }

  return NextResponse.json({
    hasSavedMethod: true,
    brand: paymentMethod.card.brand,
    last4: paymentMethod.card.last4,
  });
}
