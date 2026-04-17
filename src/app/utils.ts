import va from "@vercel/analytics";
import { toast } from "react-toastify";
import { fromSats } from "satcomma";
import type { GameStatus } from "@/types/payer";

export const validateLnurl = async (lnurl: string) => {
  const url = `/api/validate?lnurl=${encodeURIComponent(lnurl)}`;
  const res = await fetch(url, { method: "GET" });
  const data = await res.json();
  if (res.status === 200 && data.domain) {
    return { valid: true, domain: data.domain };
  } else {
    return { valid: false };
  }
};

export const handleStatusUpdate = (
  status: GameStatus,
  lnAddress: string,
  userAddress: string | null,
  jackpot: number,
  timestamp: number,
  isWinner: boolean,
  gameEnded: boolean,
) => {
  if (status === "LIVE" && lnAddress !== userAddress) {
    va.track("Bid", { user: lnAddress, jackpot, timestamp });
    toast(`Bid Received! - ${lnAddress}`, { type: "info" });
  } else if (gameEnded && isWinner) {
    va.track("Winner", { user: lnAddress, jackpot, timestamp });
    toast(`CONGRATULATIONS! You've won ₿ ${fromSats(jackpot)}!`, {
      type: "success",
      pauseOnFocusLoss: true,
    });
  } else if (gameEnded && !isWinner) {
    toast(`Timer Expired! ${lnAddress} wins ₿ ${fromSats(jackpot)}!`, {
      type: "info",
      pauseOnFocusLoss: true,
    });
  }
};
