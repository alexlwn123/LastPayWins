import Pusher from "pusher";
// import 'server-only';
const client = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true,
});

let lastPayer: { lnAddress; timestamp; jackpot } = {
  lnAddress: 'Bidding is open!',
  timestamp: Date.now(),
  jackpot: 0,
};
export const updateLastPayer = async (lnAddress, timestamp, isNew) => {
  const amount = parseInt(process.env.INVOICE_AMOUNT ?? '0') || 100;
  const newJackpot = (isNew ? parseInt(lastPayer.jackpot ?? '0') : 0) + amount;
  const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
  // const currentState = await client.get({ path: "/channels/cache-last-player" });
  // const state = await currentState.json();
  // console.log('lib', state.body);

  client.trigger(channel, "update", {
    lnAddress,
    timestamp: Date.now(),
    jackpot: newJackpot,
  });
  lastPayer = { lnAddress, timestamp, jackpot: newJackpot };
  return lastPayer;
}
export const getLastPayer = async () => {
  const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
  const currentState = await client.get({ path: `/channels/${channel}` });
  const state = await currentState.json();
  return state;
};


export default client;
