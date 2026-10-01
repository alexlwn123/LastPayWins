"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
export default function PaymentStatus() {
  const payout = useQuery(api.payouts.latest);
  const settings = useQuery(api.invoices.settings);
  return (
    <output>
      {settings?.simulation && (
        <p>
          Local simulation: enter alice@example.test to try a payment. No
          Bitcoin moves.
        </p>
      )}
      {settings && (
        <p>
          Each bid adds {settings.creditedAmount.toLocaleString()} sats to the
          jackpot.
        </p>
      )}
      {payout && (
        <p>
          {payout.kind === "prize" ? "Winner payout" : "Late-payment return"}:{" "}
          {payout.amount} sats to {payout.destination} — {payout.status}.
        </p>
      )}
    </output>
  );
}
