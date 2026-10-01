import { expect, test } from "vitest";
import { jackpotPayout } from "./paymentRules";

test.each([
  [10000, 500, 9500, 500],
  [10001, 500, 9501, 500],
  [19590, 0, 19590, 0],
  [0, 500, 0, 0],
])("quotes %i sats at %i basis points", (jackpot, bps, winner, fee) => {
  expect(jackpotPayout(jackpot, bps)).toEqual({ winnerAmount: winner, platformFeeAmount: fee });
});
