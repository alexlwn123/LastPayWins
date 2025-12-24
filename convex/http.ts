import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// SatsPay webhook endpoint - called when a charge is paid
http.route({
  path: "/webhook/satspay",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      // SatsPay webhook payload contains charge info
      // The charge ID is sent in the webhook
      const chargeId = body.id as string | undefined;

      if (!chargeId) {
        console.error("SatsPay webhook: missing charge ID", body);
        return new Response("Missing charge ID", { status: 400 });
      }

      // Look up invoice by charge ID and settle it
      const invoice = await ctx.runQuery(internal.invoices.getByChargeId, {
        chargeId,
      });

      if (!invoice) {
        console.error("SatsPay webhook: invoice not found for charge", chargeId);
        return new Response("Invoice not found", { status: 404 });
      }

      if (invoice.status !== "pending") {
        // Already processed, return success
        return new Response("OK", { status: 200 });
      }

      // Settle the invoice
      await ctx.runMutation(internal.invoices.settle, {
        invoiceId: invoice._id,
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("SatsPay webhook error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

export default http;
