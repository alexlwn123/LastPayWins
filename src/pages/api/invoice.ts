import { Agent } from "https";
import fetch from 'node-fetch';
import pusher, { updateLastPayer } from '../../lib/pusher';

const getInvoice = async () => { 
  const amount = process.env.INVOICE_AMOUNT || 1000;
  const expiry = 3600;
  const memo = "Pay me for the thing";
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

const checkInvoice = async (rHash, lnAddress) => {
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
    const currentState = await pusher.get({ path: "/channels/cache-last-payer" });
    console.log('currentState', currentState);
    // await pusher.trigger("cache-timer", "reset", {});
    // await pusher.trigger('cache-last-payer', 'update', {lnAddress: 'test', timestamp: Date.now(), jackpot: jackpot});
    await updateLastPayer(lnAddress, Date.now());
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
      const rHash = req.query.hash;
      const lnAddress = req.query.lnaddr;
      const data = await checkInvoice(rHash, lnAddress);
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}