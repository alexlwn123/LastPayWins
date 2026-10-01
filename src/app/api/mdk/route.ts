import { requireLiveConfig } from "@/lib/payments/config";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    requireLiveConfig();
  } catch {
    return new Response("MDK is not configured", { status: 503 });
  }
  // The app creates checkouts through its own server bridge. Expose only SDK infrastructure handlers.
  const body = await request
    .clone()
    .json()
    .catch(() => null);
  const handler = body?.handler ?? body?.route ?? body?.target;
  if (
    ![
      "webhook",
      "webhooks",
      "ping",
      "balance",
      "list_channels",
      "sync_rgs",
    ].includes(handler)
  )
    return new Response("Unsupported handler", { status: 400 });
  return (await import("@moneydevkit/nextjs/server/route")).POST(request);
}
