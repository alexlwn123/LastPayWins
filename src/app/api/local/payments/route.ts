import { forwardPaymentEvent, isLocalSimulation } from "@/lib/payments/config";
import { simulateReceipt, simulationState } from "@/lib/payments/simulation";
export const runtime = "nodejs";
function allowed(request: Request) {
  const url = new URL(`http://${request.headers.get("host")}`);
  return (
    isLocalSimulation() &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    (!request.headers.get("origin") ||
      request.headers.get("origin") === url.origin)
  );
}
export async function GET(request: Request) {
  return allowed(request)
    ? Response.json(simulationState())
    : new Response("Not found", { status: 404 });
}
export async function POST(request: Request) {
  if (
    !allowed(request) ||
    request.headers.get("origin") !== `http://${request.headers.get("host")}`
  )
    return new Response("Not found", { status: 404 });
  const { checkoutId } = await request.json();
  try {
    const checkout = simulateReceipt(checkoutId);
    await forwardPaymentEvent(
      `simulation-${checkout.checkoutId}`,
      checkout.attemptId,
    );
    return Response.json({ simulated: true });
  } catch {
    return new Response("Simulation failed", { status: 400 });
  }
}
