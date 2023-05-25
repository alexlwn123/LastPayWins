import { get } from 'http';
import fetch from 'node-fetch';
import { getLastPayer } from './pusher';
type ScanResult = {
  status: string;
  callback: string;
  description: string;
  description_hash: string;
  minSendable: number;
  maxSendable: number;
} | { error: string, status: string }
export const readLnurl = async (lnurl: string): Promise<ScanResult> => { 
  const url = `${process.env.LNBITS_URL!}/api/v1/lnurlscan/${lnurl}`;
  const data = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.LNBITS_API_KEY!,
    },
  });
  if (data.status !== 200) {
    console.error('data', await data.json());
    return { error: data.statusText, status: 'failed' };
  }
  const rawResult = await data.json() as ScanResult;
  return rawResult;
};

export const payLnurl = async () => {
  const winner = await getLastPayer();
  const timeLeft = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') - Math.floor((Date.now() - winner.timestamp) / 1000);
  if (timeLeft > 0) {
    return { status: 'failed', error: 'Illegal Payment', code: 0 };
  }
  if (timeLeft < -30) {
    return { status: 'failed', error: 'Illegal Payment', code: 1 };
  }
  const url = `${process.env.LNBITS_URL!}/api/v1/payments/lnurl`;
  const lnurlData: ScanResult = await readLnurl(winner.lnAddress);
  if (lnurlData.status !== 'OK' || 'error' in lnurlData) {
    return { status: 'failed', error: lnurlData.status };
  }
  const amount = winner.jackpot;
  const body =  {
    amount: amount * 1000, // millisatoshis
    callback: lnurlData.callback,
    comment: `Congraturations! You've won ${amount} satoshis from LastPayWins!`,
    description: lnurlData.description,
    description_hash: lnurlData.description_hash,
  };
  
  const data = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.LNBITS_API_KEY_ADMIN!,
    },
    body: JSON.stringify(body)
  });
  if (data.status !== 200) {
    return { status: 'failed', error: await data.json() };
  }
  const rawResult = await data.json();
  return rawResult;
}

export const checkLnbitsInvoice = async (paymentHash: string) => {
  const url = `${process.env.LNBITS_URL!}/api/v1/payments/${paymentHash}`;
  const rawData = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.LNBITS_API_KEY_ADMIN!,
    }
  });
  const data = await rawData.json();
  return data;

};

export const getLnbitsInvoice = async () => {
  const amount = process.env.INVOICE_AMOUNT || 1000;
  const url = `${process.env.LNBITS_URL!}/api/v1/payments`;
  const body = {
    out: false,
    amount: amount, // Sats
    memo: 'Last Pay Wins',
    expiry: 3600,
    unit: 'sat',
  };

  const rawData = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.LNBITS_API_KEY_ADMIN!,
    },
    body: JSON.stringify(body)
  });
  const data = await rawData.json();
  return data;
};