import { inngest } from "@/pages/api/inngest";
import Pusher from "pusher";
import { Event as NostrEvent } from 'nostr-tools'
import { publishEvent } from "./nostr";

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
  timestamp: number,
  eventId: string
}

export const updateLastPayer = async (lnAddress: string, event: NostrEvent | null) => {
  const amount = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT ?? '0') || 100;
  const previousPayer = await getLastPayer();
  const timeLeft = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') - Math.floor((Date.now() - previousPayer.timestamp) / 1000);
  const previousJackpot = timeLeft > 0 ? previousPayer.jackpot : 0;
  let eventId = previousPayer.eventId
  if (previousPayer.jackpot === 0 || timeLeft < 0) {
    // Multiple posts possible if two people start round at same time?
    // TODO: Always send event in query so if payment is made right when round finished
    // (on a replaced QR Invoice) it will start a new round and bump the eventID
    if (event) {
      eventId = event.id
      if (process.env.NOSTR_ENABLED === 'true') publishEvent(event)
    }
    else console.error("Should be a nostr event attached")
  }

  const payer: Payer = {
    lnAddress,
    timestamp: Date.now(),
    jackpot: previousJackpot + amount, 
    eventId: eventId
  };

  client.trigger(channelName, "update", payer);
  await inngest.send({
    id: `bid-${payer.lnAddress}-${payer.timestamp}-${payer.jackpot}`,
    name: 'bid',
    data: payer,

  })
  return payer;
}

export const getLastPayer = async (): Promise<Payer> => {
  const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
  const currentState = await client.get({ path: `/channels/${channel}`, params: {info: ['cache']} });
  const state = await currentState.json() as {cache?: {data: string}};
  const lastPayer = state?.cache?.data
  if (!lastPayer) return {jackpot: 0, lnAddress: 'none', timestamp: 0, eventId: ''};
  try {
    const lastPayerJson = JSON.parse(lastPayer) as Payer;
    return lastPayerJson;
  } catch(e) {
    return {jackpot: 0, lnAddress: 'none', timestamp: 0, eventId: ''};
  }
};

export default client;
