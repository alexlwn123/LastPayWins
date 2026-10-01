import type { NextRequest } from "next/server";
import { readLnurl } from "@/lib/lightning";
import { isLocalSimulation } from "@/lib/payments/config";

export const GET = async (req: NextRequest) => {
  const lnurl = req.nextUrl.searchParams.get("lnurl");
  if (!lnurl) {
    return new Response("Missing lnurl", { status: 400 });
  }
  if (isLocalSimulation() && /^[a-z0-9-]+@example\.test$/.test(lnurl)) {
    return Response.json({ status: "OK", domain: "example.test" });
  }
  const data = await readLnurl(lnurl);
  return Response.json(data);
};
