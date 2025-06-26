import { kv } from "@vercel/kv";
import { checkLnbitsInvoice, createLnbitsInvoice } from "@/lib/lightning";
import { INVOICE_AMOUNT } from "@/lib/serverEnvs";
import { updateLastPayer } from "../../lib/pusher";

const getInvoice = async () => {
  const amount = parseInt(INVOICE_AMOUNT || "1000");
  const expiry = 3600;
  const memo = "Bid - Last Pay Wins";
  return await createLnbitsInvoice(amount, memo, expiry);
};

const checkInvoice = async (hash, lnAddress) => {
  const data = await checkLnbitsInvoice(hash);
  if (data.settled) {
    await updateLastPayer(lnAddress);
  }
  return data;
};

export default async (req, res) => {
  try {
    if (req.method === "POST") {
      const data = await getInvoice();
      res.status(200).json(data);
    } else if (req.method === "GET") {
      const rHash = decodeURIComponent(req.query.hash);
      const lnAddress = req.query.lnaddr;
      const data = await checkInvoice(rHash, lnAddress);
      if (data.settled) {
        const seen = await kv.get(rHash);
        if (seen) {
          res.status(200).json({ status: "SUCK IT MANMEET & CONNER" });
          return;
        }
        await kv.set(rHash, true); // Mark as paid
      }
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: "Method not supported" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  }
};
