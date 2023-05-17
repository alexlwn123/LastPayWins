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
  lnAddress: 'alex@getalby.com',
  timestamp: Date.now(),
  jackpot: 100000,
};
export const updateLastPayer = async (lnAddress, timestamp) => {
  const amount = process.env.INVOICE_AMOUNT || 100;
  const newJackpot = lastPayer.jackpot + amount;
  const currentState = await client.get({ path: "/channels/cache-last-payer" });
  const state = await currentState.json();
  console.log('lib', state);

  client.trigger("cache-last-payer", "update", {
    lnAddress,
    timestamp: Date.now(),
    jackpot: newJackpot,
  });
  lastPayer = { lnAddress, timestamp, jackpot: newJackpot };
}
export const getLastPayer = async () => {
  console.log('lib', client);
  const currentState = await client.get({ path: "/channels/cache-last-player" });
  const state = await currentState.json();
  console.log('lib', state);
  return state;
};


export default client;
