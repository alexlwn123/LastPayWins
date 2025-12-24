import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { recordBid } from "@/lib/convex";
import { checkLnbitsInvoice, createLnbitsInvoice } from "@/lib/lightning";
import { INVOICE_AMOUNT } from "@/lib/serverEnvs";

export const dynamic = "force-dynamic";

const getInvoice = async () => {
  const amount = parseInt(INVOICE_AMOUNT || "1000");
  const expiry = 3600;
  const memo = "Bid - Last Pay Wins";
  try {
    return await createLnbitsInvoice(amount, memo, expiry);
  } catch (e) {
    console.error(e, { amount, memo, expiry });
    throw new Error("Failed to get invoice");
  }
};

const checkInvoice = async (hash: string, lnAddress: string) => {
  const data = await checkLnbitsInvoice(hash);
  if (data.settled) {
    await recordBid(lnAddress);
  }
  return data;
};

export const GET = async (req: NextRequest) => {
  try {
    const hash = req.nextUrl.searchParams.get("hash");
    if (!hash) {
      return new Response("Missing hash", { status: 400 });
    }
    const rHash = decodeURIComponent(hash);
    const lnAddress = req.nextUrl.searchParams.get("lnaddr");
    if (!lnAddress) {
      return new Response("Missing lnaddr", { status: 400 });
    }
    const data = await checkInvoice(rHash, lnAddress);
    if (data.settled) {
      const seen = await kv.get(rHash);
      if (seen) {
        return Response.json({ status: "SUCK IT MANMEET & CONNER" });
      }
      await kv.set(rHash, true); // Mark as paid
    }
    return Response.json(data);
  } catch (e) {
    console.error(e, { method: req.method, query: req.nextUrl.searchParams });
    return new Response(JSON.stringify(e), { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const data = await getInvoice();
    return Response.json(data);
  } catch (e) {
    console.error(e, { method: req.method, query: req.nextUrl.searchParams });
    return new Response(JSON.stringify(e), { status: 500 });
  }
};
