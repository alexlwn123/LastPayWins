import { forwardPaymentEvent } from "@/lib/payments/config";
import { verifyPaymentEvent } from "@/lib/payments/webhook";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.MDK_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  let event: ReturnType<typeof verifyPaymentEvent>;
  try {
    event = verifyPaymentEvent(await request.text(), request.headers, secret);
  } catch {
    return new Response("Invalid webhook", { status: 401 });
  }
  if (!event) return Response.json({ received: true });
  try {
    await forwardPaymentEvent(event.eventId, event.attemptId);
  } catch {
    return new Response("Event storage unavailable", { status: 503 });
  }
  return Response.json({ received: true });
}
