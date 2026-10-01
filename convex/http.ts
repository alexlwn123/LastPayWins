import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
const http = httpRouter();
http.route({
  path: "/payments/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.PAYMENT_BRIDGE_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
      return new Response("Unauthorized", { status: 401 });
    const body = await request.json();
    if (
      typeof body.eventId !== "string" ||
      body.eventId.length > 200 ||
      typeof body.attemptId !== "string" ||
      body.attemptId.length > 100
    )
      return new Response("Invalid event", { status: 400 });
    await ctx.runMutation(internal.paymentEvents.receive, {
      eventId: body.eventId,
      attemptId: body.attemptId,
    });
    return Response.json({ received: true });
  }),
});
export default http;
