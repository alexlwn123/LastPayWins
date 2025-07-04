import va from "@vercel/analytics";
import { toast } from "react-toastify";
import { fromSats } from "satcomma";
import type { Status } from "@/types/payer";

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
  status: Status,
  lnAddress: string,
  userAddress: string | null,
  jackpot: number,
  timestamp: number,
) => {
  if (status === "LIVE" && lnAddress !== userAddress) {
    va.track("Bid", { user: lnAddress, jackpot, timestamp });
    toast(`Bid Received! - ${lnAddress}`, { type: "info" });
  } else if (status === "EXPIRED" && lnAddress !== userAddress) {
    toast(`Timer Expired! ${lnAddress} wins ₿ ${fromSats(jackpot)}!`, {
      type: "info",
      pauseOnFocusLoss: true,
    });
  } else if (status === "WINNER") {
    va.track("Winner", { user: lnAddress, jackpot, timestamp });
    toast(`CONGRATULATIONS! You've won ₿ ${fromSats(jackpot)}!`, {
      type: "success",
      pauseOnFocusLoss: true,
    });
  } else if (status === "PAYMENT_SUCCESS") {
    va.track("Winner Payment Success", { user: lnAddress, jackpot, timestamp });
    toast(`Payment Settled! Enjoy your Sats!`, {
      type: "success",
      pauseOnFocusLoss: true,
    });
  } else if (status === "PAYMENT_FAILED") {
    va.track("Winner Payment Failed", { user: lnAddress, jackpot, timestamp });
    toast(`Payment Failed - DM @_alexlewin on Twitter to get paid.`, {
      type: "error",
      pauseOnFocusLoss: true,
    });
  }
};

export const checkInvoiceStatus = (
  setChecking,
  hash,
  setHash,
  setSettled,
  userAddress,
  setCountdownKey,
) => {
  setChecking(true);
  console.log("checking invoice");
  const url = `/api/invoice?hash=${encodeURIComponent(hash)}&lnaddr=${userAddress}`;
  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((data) => {
      console.log("data", data);
      if (data.settled) {
        setSettled(data.settled && true);
        setCountdownKey((prevKey) => prevKey + 1);
        setHash(null);
        toast("Bid Received! You're in the lead!", { type: "success" });
      }
      setChecking(false);
    })
    .catch((_) => setChecking(false));
};
