import { Webhook } from "standardwebhooks";
import { z } from "zod";

const eventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      metadata: z.object({ attemptId: z.string().min(1).max(100) }).optional(),
    })
    .passthrough(),
});
export function verifyPaymentEvent(
  body: string,
  headers: Headers,
  secret: string,
) {
  const eventId = headers.get("webhook-id") ?? "";
  const event = eventSchema.parse(
    new Webhook(secret).verify(body, {
      "webhook-id": eventId,
      "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
      "webhook-signature": headers.get("webhook-signature") ?? "",
    }),
  );
  if (event.type !== "checkout.completed") return null;
  if (!event.data.metadata?.attemptId)
    throw new Error("Missing payment attempt reference");
  return { eventId, attemptId: event.data.metadata.attemptId };
}
