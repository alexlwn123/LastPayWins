"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
export default function PaymentStatus() {
  const payout = useQuery(api.payouts.latest);
  const game = useQuery(api.games.getCurrent);
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
      {game?.platformFeeBps !== undefined && (
        <p>
          {game.platformFeeBps > 0
            ? `${game.platformFeeBps / 100}% platform fee is deducted from the jackpot. Winner receives ${game.status === "LIVE" ? `${game.winnerAmount.toLocaleString()} sats if the timer ends now` : `${100 - game.platformFeeBps / 100}% of the jackpot`}.`
            : `This round has no platform fee. New rounds have a ${(settings?.newRoundPlatformFeeBps ?? 500) / 100}% platform fee.`}
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
