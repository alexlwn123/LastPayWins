import { authorizedBridge, isLocalSimulation } from "@/lib/payments/config";
import { bridgeRequestSchema } from "@/lib/payments/contracts";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!authorizedBridge(request))
    return new Response("Unauthorized", { status: 401 });
  const parsed = bridgeRequestSchema.safeParse(await request.json());
  if (!parsed.success)
    return new Response("Invalid payment request", { status: 400 });
  try {
    const result = isLocalSimulation()
      ? (await import("@/lib/payments/simulation")).handleSimulation(
          parsed.data,
        )
      : await (await import("@/lib/payments/mdk")).handleMdk(parsed.data);
    return Response.json(result);
  } catch (error) {
    console.error(
      "Payment provider request failed",
      error instanceof Error ? error.message : "Unknown failure",
    );
    return Response.json(
      { error: "Payment provider unavailable" },
      { status: 503 },
    );
  }
}
