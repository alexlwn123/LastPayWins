import type { NextRequest } from "next/server";
import { checkLnbitsInvoice } from "@/lib/lightning";
import { NEXT_PUBLIC_PUSHER_CHANNEL } from "@/lib/publicEnvs";
import { INVOICE_AMOUNT } from "@/lib/serverEnvs";
import pusher, { updateLastPayer } from "../../../lib/pusher";

let jackpot = 0;

export const GET = async (req: NextRequest) => {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Unauthorized", { status: 401 });
  }
  const hash = req.nextUrl.searchParams.get("hash");
  const data = await checkLnbitsInvoice(hash);
  // const lastPlayer = await getLastPayer();
  return Response.json({ message: "ok", data });
};
export const POST = async () => {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Unauthorized", { status: 401 });
  }
  jackpot = jackpot + parseInt(INVOICE_AMOUNT ?? "0");
  const rawState = await pusher.get({
    path: `/channels/${NEXT_PUBLIC_PUSHER_CHANNEL}`,
    params: { info: ["cache"] },
  });
  const state = await rawState.json();
  console.log("testy - cached state", state);
  const newPayer = updateLastPayer("alexl@getalby.com");
  return Response.json({ message: "ok", data: newPayer });
};
export const DELETE = async () => {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Unauthorized", { status: 401 });
  }
  await pusher.trigger(NEXT_PUBLIC_PUSHER_CHANNEL, "update", {
    lnAddress: "None!",
    timestamp: Date.now(),
    jackpot: 0,
  });
  return Response.json({ message: "ok" });
};
export const PATCH = async (req: NextRequest) => {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json();
  await pusher.trigger(NEXT_PUBLIC_PUSHER_CHANNEL, "update", {
    lnAddress: body?.lnAddress,
    timestamp: Date.now(),
    jackpot: body?.jackpot,
  });
  const rawState = await pusher.get({
    path: `/channels/${NEXT_PUBLIC_PUSHER_CHANNEL}`,
    params: { info: ["cache"] },
  });
  const state = await rawState.json();
  return Response.json(state);
};
