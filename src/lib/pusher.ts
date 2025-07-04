"server only";
import { Agent } from "node:https";
import fetch from "node-fetch";
import Pusher from "pusher";
import { inngest } from "@/pages/api/inngest";
import {
  NEXT_PUBLIC_CLOCK_DURATION,
  NEXT_PUBLIC_PRESENCE_CHANNEL,
  NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  NEXT_PUBLIC_PUSHER_APP_KEY,
  NEXT_PUBLIC_PUSHER_CHANNEL,
} from "./publicEnvs";
import {
  INVOICE_AMOUNT,
  MACAROON,
  PUSHER_APP_ID,
  PUSHER_APP_SECRET,
  ZAPIER_WEBHOOK_URL,
} from "./serverEnvs";

const client = new Pusher({
  appId: PUSHER_APP_ID,
  key: NEXT_PUBLIC_PUSHER_APP_KEY,
  secret: PUSHER_APP_SECRET,
  cluster: NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  useTLS: true,
});
const channelName = NEXT_PUBLIC_PUSHER_CHANNEL;

type Payer = {
  lnAddress: string;
  jackpot: number;
  timestamp: number;
};
const hitWebhook = async (lnAddress, bid) => {
  const url = ZAPIER_WEBHOOK_URL;
  if (!url) {
    console.log("ZAPIER_WEBHOOK_URL is not set. Skipping webhook.");
    return;
  }
  const data = await fetch(url, {
    method: "POST",
    headers: {
      "Grpc-Metadata-macaroon": MACAROON,
      "Content-Type": "application/json",
    },
    agent: new Agent({
      rejectUnauthorized: false,
    }),
    body: JSON.stringify({
      lnAddress,
      bid,
    }),
  });
  const rawResult = await data.json();
  console.log("webhook", rawResult);
};

export const updateLastPayer = async (lnAddress) => {
  console.log("updating last payer", lnAddress);
  const amount = parseInt(INVOICE_AMOUNT ?? "0") || 100;
  const previousPayer = await getLastPayer();
  const timeLeft =
    parseInt(NEXT_PUBLIC_CLOCK_DURATION ?? "60") -
    Math.floor((Date.now() - previousPayer.timestamp) / 1000);
  const previousJackpot = timeLeft > 0 ? previousPayer.jackpot : 0;

  const payer: Payer = {
    lnAddress,
    timestamp: Date.now(),
    jackpot: previousJackpot + amount,
  };
  client.trigger(channelName, "update", payer);
  await inngest.send({
    id: `bid-${payer.lnAddress}-${payer.timestamp}-${payer.jackpot}}`,
    name: "bid",
    data: payer,
  });
  await hitWebhook(lnAddress, payer.jackpot).catch((e) =>
    console.error("webhook failed", e),
  );
  return payer;
};

export const getLastPayer = async (): Promise<Payer> => {
  const channel = NEXT_PUBLIC_PUSHER_CHANNEL;
  const currentState = await client.get({
    path: `/channels/${channel}`,
    params: { info: ["cache"] },
  });
  const state = (await currentState.json()) as { cache?: { data: string } };
  const lastPayer = state?.cache?.data;
  if (!lastPayer) return { jackpot: 0, lnAddress: "none", timestamp: 0 };
  try {
    const lastPayerJson = JSON.parse(lastPayer) as Payer;
    return lastPayerJson;
  } catch {
    return { jackpot: 0, lnAddress: "none", timestamp: 0 };
  }
};

export const authorizeUser = async (
  socketId: string,
  uuid: string,
): Promise<Pusher.ChannelAuthResponse> => {
  const channel = NEXT_PUBLIC_PRESENCE_CHANNEL;
  const presenceData = {
    user_id: uuid,
  };
  const authResponse = client.authorizeChannel(socketId, channel, presenceData);
  return authResponse;
};

export default client;
