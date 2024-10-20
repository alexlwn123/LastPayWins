import { Agent } from "https";
import fetch from 'node-fetch';
import { updateLastPayer } from '../../lib/pusher';
import { checkLnbitsInvoice, getLnbitsInvoice } from "@/lib/lnbits";

const getInvoice = async () => { 
  const amount = process.env.INVOICE_AMOUNT || 1000;
  const expiry = 3600;
  const memo = "Bid - Last Pay Wins";
  const url = `${process.env.LND_HOST}/v1/invoices`
  const data = await fetch(url, {
    method: 'POST',
    headers: {
      'Grpc-Metadata-macaroon': process.env.MACAROON!,
      'Content-Type': 'application/json',
    },
    agent: new Agent({
      rejectUnauthorized: false,
    }),
    body: JSON.stringify({
      memo,
      value: amount,
      expiry
    })
  });
  const rawResult = await data.json() as { payment_request: string, r_hash: string };
  return {
    rHash: rawResult.r_hash,
    invoice: rawResult.payment_request,
    amount: amount,
    expiry: expiry,
  }
}

const checkInvoice = async (hash, lnAddress) => {
  const data = await checkLnbitsInvoice(hash) as {paid: boolean};
  if (data.paid) {
    await updateLastPayer(lnAddress);
  }
  return { settled: data.paid }
};

const seen = new Set();

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      const data = await getLnbitsInvoice();
      res.status(200).json(data);
    } else if (req.method === 'GET') {
      const rHash = decodeURIComponent(req.query.hash);
      if (seen.has(rHash)) {
        res.status(200).json({ settled: true });
        return;
      }
      const lnAddress = req.query.lnaddr;
      const data = await checkInvoice(rHash, lnAddress);
      if (data.settled) {
        seen.add(rHash);
      }
      res.status(200).json(data);
    // } else if (req.method === 'PATCH'){ 
    //   const data = await getLnbitsInvoice();
    //   res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}