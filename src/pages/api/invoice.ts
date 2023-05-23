import { Agent } from "https";
import fetch from 'node-fetch';
import pusher, { updateLastPayer } from '../../lib/pusher';

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

const checkInvoice = async (rHash, lnAddress, isNew) => {
  const hash = Buffer.from(rHash.toString(), 'base64').toString('hex');
  const url = `${process.env.LND_HOST}/v1/invoice/${hash}`
  const data = await fetch(url, {
    method: 'GET',
    headers: {
      'Grpc-Metadata-macaroon': process.env.MACAROON!,
      'Content-Type': 'application/json',
    },
    agent: new Agent({
      rejectUnauthorized: false,
    }),
  });
  const rawResult = await data.json() as { settled: string, state: string };
  if (rawResult?.settled) {
    // Reset timer 
    // BROKEN FUHHHHk
    // const currentState = await pusher.get({ path: "/channels/cache-last-payer" });
    // console.log('currentState', currentState);
    await updateLastPayer(lnAddress, Date.now(), isNew);
  }
  return {
    settled: rawResult.settled,
    state: rawResult.state
  }
};

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      const data = await getInvoice();
      res.status(200).json(data);
    } else if (req.method === 'GET') {
      const rHash = decodeURIComponent(req.query.hash);
      const lnAddress = req.query.lnaddr;
      const isNew = req.query.new;
      const data = await checkInvoice(rHash, lnAddress, isNew);
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}