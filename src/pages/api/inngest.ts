import { ScanResult } from "@/lib/lnbits";
import { Inngest } from "inngest";
import { serve } from "inngest/next";
import fetch from 'node-fetch';

// Create a client to send and receive events
export const inngest = new Inngest({ name: "Last Pay Wins" });

const duration = parseInt(`${process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '300'}`);
const handleExpiry = inngest.createFunction(
  { name: 'Bid Received', 
    retries: 0, 
    // Cancels on bid event if the bid is within the duration
    cancelOn: [
      { event: 'bid', if: `async.data.timestamp - event.data.timestamp < ${duration * 1000}`, timeout: `${duration}s` }
    ]
  }, 
  { event: 'bid' },
  async ({ event, step }) => { 

    const { timestamp, lnAddress, jackpot } = event.data;

    const targetDate = await step.run('setup', () => {
      if (!timestamp || !lnAddress || !jackpot) return;

      const targetTimestamp = timestamp + duration * 1000
      return targetTimestamp;
    });

    // Wait until the target date
    await step.sleepUntil(new Date(targetDate));

    // Scan the bidder's lnurl
    const lnurlRes: ScanResult = await step.run("Read Lnurl", async () => { 
      const res = await fetch(`${process.env.LNBITS_URL!}/api/v1/lnurlscan/${lnAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.LNBITS_API_KEY!,
        },
      })
      return await res.json() as ScanResult;
    });

    // Pay the winner 
    await step.run("Pay Winner", async () => {
      const amount = jackpot;
      if (lnurlRes.status !== 'OK' || 'error' in lnurlRes) {
        return { status: 'failed', error: lnurlRes.status };
      }
      const body =  {
        amount: amount * 1000, // millisatoshis
        callback: lnurlRes.callback,
        comment: `Congraturations! You've won ${amount} satoshis from LastPayWins!`,
        description: lnurlRes.description,
        description_hash: lnurlRes.description_hash,
      };
      const url = `${process.env.LNBITS_URL!}/api/v1/payments/lnurl`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.LNBITS_API_KEY_ADMIN!,
        },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      return result;
    });
  }
);

export default serve(inngest, [handleExpiry]);
