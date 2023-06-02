import { pay } from "@/lib/lnbits";
import { getLastPayer } from "@/lib/pusher";
import { Inngest } from "inngest";
import { serve } from "inngest/next";

// Create a client to send and receive events
export const inngest = new Inngest({ name: "Last Pay Wins" });

const handleExpiry = inngest.createFunction(
  { name: 'Bid Received' }, 
  { event: 'bid' },
  async ({ event }) => { 

    const { timestamp, lnAddress, jackpot } = event.data;
    if (!timestamp || !lnAddress || !jackpot) return;

    const duration = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '300'); 
    const timeUntilExpiry = (duration * 1000) - (Date.now() - timestamp);
    if (timeUntilExpiry <= 0) return;

    // Waiting until it's time to pay the winner
    await new Promise(r => setTimeout(r, timeUntilExpiry));
    const lastPayer = await getLastPayer();

    // check if any more bid events have been received since we started waiting 
    if (lastPayer.lnAddress !== lnAddress || lastPayer.timestamp !== timestamp) return;

    console.log('PAYING WINNER', lastPayer)
    const result = await pay(lastPayer.lnAddress, lastPayer.jackpot);
    console.log('RESULT', result);

    return result;
  }
);

export default serve(inngest, [handleExpiry]);
