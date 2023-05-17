import Pusher from "pusher";

const client = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true,
});

let lastPayer: { lnAddress, timestamp, jackpot } = { lnAddress: null, timestamp: null, jackpot: 0 };
export const updateLastPayer = async (lnAddress, timestamp) => {
  const amount = process.env.INVOICE_AMOUNT || 100;
  const newJackpot = lastPayer.jackpot + amount;
  client.trigger("last-payer", "update", {
    lnAddress,
    timestamp: Date.now(),
    jackpot: newJackpot,
  });
  lastPayer = { lnAddress, timestamp, jackpot: newJackpot };
}
export const getLastPayer = async () => {
  return lastPayer;
};


export default client;
