import Pusher from "pusher";
import { Event as NostrEvent } from 'nostr-tools'

const client = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true,
});
const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;

export const updateLastPayer = async (lnAddress, event: NostrEvent | null) => {
  const amount = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT ?? '0') || 100;
  const previousPayer = await getLastPayer();
  const timeLeft = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') - Math.floor((Date.now() - previousPayer.timestamp) / 1000);
  const previousJackpot = timeLeft > 0 ? previousPayer.jackpot : 0;
  let eventId = previousPayer.eventId
  if (previousPayer.jackpot === 0) {
    console.log('UPDATE LAST PLAYER event', event)
    // TODO: Publish event. Need to make sure we can't double post event
    // await publishEvent(event)
    if (event) eventId = event.id
    else console.error("Should be a nostr event attached")
  }

  const payer = {
    lnAddress,
    timestamp: Date.now(),
    jackpot: previousJackpot + amount, 
    eventId: eventId
  };
  console.log('triggering update', payer)
  client.trigger(channel, "update", payer);
  return payer;
}
export const getLastPayer = async (): Promise<{ lnAddress: string, jackpot: number, timestamp: number, eventId: string }> => {
  const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
  const currentState = await client.get({ path: `/channels/${channel}`, params: {info: ['cache']} });
  const state = await currentState.json() as {cache?: {data: string}};
  console.debug('getLastPayer state', state)
  const lastPayer = state?.cache?.data
  if (!lastPayer) return {jackpot: 0, lnAddress: 'none', timestamp: 0, eventId: ''};
  const lastPayerJson = JSON.parse(lastPayer) as {lnAddress: string, timestamp: number, jackpot: number, eventId: string};
  return lastPayerJson;
};


export default client;
