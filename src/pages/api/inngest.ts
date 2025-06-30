import { Inngest } from "inngest";
import { serve } from "inngest/next";
import fetch from "node-fetch";
import type { ScanResult } from "@/lib/lightning";
import { NEXT_PUBLIC_CLOCK_DURATION } from "@/lib/publicEnvs";
import { LNBITS_API_KEY, LNBITS_URL } from "@/lib/serverEnvs";

// Create a client to send and receive events
export const inngest = new Inngest({ name: "Last Pay Wins" });

const duration = parseInt(NEXT_PUBLIC_CLOCK_DURATION ?? "300");
const handleExpiry = inngest.createFunction(
  {
    name: "Bid Received",
    // retries: 3,
    // Cancels on bid event if the bid is within the duration
    cancelOn: [
      {
        event: "bid",
        if: `async.data.timestamp - event.data.timestamp < ${duration * 1000}`,
        timeout: `${duration}s`,
      },
    ],
  },
  { event: "bid" },
  async ({ event, step }) => {
    const { timestamp, lnAddress, jackpot } = event.data;

    const targetDate = await step.run("setup", () => {
      if (!timestamp || !lnAddress || !jackpot) return;

      const targetTimestamp = timestamp + duration * 1000;
      return targetTimestamp;
    });

    // Wait until the target date
    await step.sleepUntil(new Date(targetDate));

    // Scan the bidder's lnurl
    const lnurlRes: ScanResult = await step.run("Read Lnurl", async () => {
      const res = await fetch(`${LNBITS_URL}/api/v1/lnurlscan/${lnAddress}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LNBITS_API_KEY,
        },
      });
      const result = (await res.json()) as ScanResult;
      if (result.status !== "OK" || "error" in result) {
        throw new Error(
          `Read lnurl failed: ${lnAddress} - ${JSON.stringify(result)}`,
        );
      }
      return result;
    });

    // Pay the winner
    await step.run("Pay Winner", async () => {
      const amount = jackpot;
      const chargeFee = amount >= 20000;
      const body = {
        amount: amount * 1000 * (chargeFee ? 0.9 : 1), // millisatoshis, deduct 10% for fees
        // amount: 500, // millisatoshis
        callback: lnurlRes.callback,
        comment: `Congratulations! You've won the ${amount} satoshi jackpot from LastPayWins!${chargeFee ? " (10% deducted for fees)" : ""}`,
        description: lnurlRes.description,
        description_hash: lnurlRes.description_hash,
      };
      const url = `${LNBITS_URL}/api/v1/payments/lnurl`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LNBITS_API_KEY,
        },
        body: JSON.stringify(body),
      });
      const result = (await res.json()) as {
        success_action: string;
        error: string;
      };
      if (!("success_action" in result || "payment_hash" in result)) {
        throw new Error(
          `Pay failed: ${lnAddress}: ${amount} sats - ${JSON.stringify(result)}`,
        );
      }
      return { success: "true", data: result };
    });
  },
);

export default serve(inngest, [handleExpiry]);
