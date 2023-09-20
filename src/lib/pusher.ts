import { inngest } from "@/pages/api/inngest";
import { Agent } from "https";
import fetch from 'node-fetch';
import Pusher from "pusher";

const client = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true,
});
const channelName = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;

type Payer = {
  lnAddress: string, 
  jackpot: number, 
  timestamp: number 
}
const hitWebhook = async (lnAddress, bid) => {

  const url = `${process.env.ZAPIER_WEBHOOK_URL ?? 'https://webhook.site'}`
  const data = await fetch(url, {
    method: 'POST',
    headers: {
      'Grpc-Metadata-macaroon': process.env.MACAROON!,
      'Content-Type': 'application/json',
    },
    agent: new Agent({
      rejectUnauthorized: false,
    }),
    body: JSON.stringify({
      lnAddress,
      bid,
    })
  });
  const rawResult = await data.json()
  console.log('webhook', rawResult);

};

export const updateLastPayer = async (lnAddress) => {
  const amount = parseInt(process.env.INVOICE_AMOUNT ?? '0') || 100;
  const previousPayer = await getLastPayer();
  const timeLeft = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') - Math.floor((Date.now() - previousPayer.timestamp) / 1000);
  const previousJackpot = timeLeft > 0 ? previousPayer.jackpot : 0;

  const payer: Payer = {
    lnAddress,
    timestamp: Date.now(),
    jackpot: previousJackpot + amount, 
  };
  client.trigger(channelName, "update", payer);
  await inngest.send({
    id: `bid-${payer.lnAddress}-${payer.timestamp}-${payer.jackpot}}`,
    name: 'bid',
    data: payer,
  })
  await hitWebhook(lnAddress, payer.jackpot).catch(e => console.error('webhook failed', e));
  return payer;
}

export const getLastPayer = async (): Promise<Payer> => {
  const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
  const currentState = await client.get({ path: `/channels/${channel}`, params: {info: ['cache']} });
  const state = await currentState.json() as {cache?: {data: string}};
  const lastPayer = state?.cache?.data
  if (!lastPayer) return {jackpot: 0, lnAddress: 'none', timestamp: 0};
  try {
    const lastPayerJson = JSON.parse(lastPayer) as Payer;
    return lastPayerJson;
  } catch(e) {
    return {jackpot: 0, lnAddress: 'none', timestamp: 0};
  }
};

export const authorizeUser = async (socketId: string, uuid: string): Promise<Pusher.ChannelAuthResponse> => {
  const channel = process.env.NEXT_PUBLIC_PRESENCE_CHANNEL!;
  const presenceData = {
    user_id: uuid,
  };
  const authResponse = client.authorizeChannel(socketId, channel, presenceData);
  return authResponse;

}

export default client;
