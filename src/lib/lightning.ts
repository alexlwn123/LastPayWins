import fetch from "node-fetch";
import { Agent } from "https";

type Invoice = { payment_request: string; r_hash: string };
// export type CreateInvoice = (amount: number, memo: string, expiry: number) => Promise<{ invoice: string; rHash: string }>;
export type CheckInvoice = (rHash: string) => Promise<{ settled: boolean }>;

const apiKey = process.env.LNBITS_API_KEY_ADMIN;
const lnbitsUrl = process.env.LNBITS_URL;
const lndHost = process.env.LND_HOST;
const macaroon = process.env.MACAROON;

if (!apiKey) throw new Error("LNBITS_API_KEY_ADMIN is not set");
if (!lnbitsUrl) throw new Error("LNBITS_URL is not set");
if (!lndHost) throw new Error("LND_HOST is not set");
if (!macaroon) throw new Error("MACAROON is not set");

export const createLnbitsInvoice = async (amount, memo, expiry) => {
  const url = `${lnbitsUrl}/api/v1/payments`;
  const body = {
    out: false,
    amount: amount, // Sats
    memo: memo,
    expiry: expiry,
    unit: "sat",
  };

  const rawData = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  return (await rawData.json()) as {
    payment_request: string;
    payment_hash: string;
  };
};

export const checkLnbitsInvoice: CheckInvoice = async (paymentHash) => {
  const url = `${lnbitsUrl}/api/v1/payments/${paymentHash}`;
  const rawData = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });
  return (await rawData.json()) as { settled: boolean };
};

export const createLndInvoice = async (
  amount: number,
  memo: string,
  expiry: number,
): Promise<Invoice> => {
  const url = `${lndHost}/v1/invoices`;
  const data = await fetch(url, {
    method: "POST",
    headers: {
      "Grpc-Metadata-macaroon": macaroon,
      "Content-Type": "application/json",
    },
    agent: new Agent({
      rejectUnauthorized: false,
    }),
    body: JSON.stringify({
      memo,
      value: amount,
      expiry,
    }),
  });
  return (await data.json()) as { payment_request: string; r_hash: string };
};

export type ScanResult =
  | {
      status: string;
      callback: string;
      description: string;
      description_hash: string;
      minSendable: number;
      maxSendable: number;
    }
  | { error: string; status: string };
export const readLnurl = async (lnurl: string): Promise<ScanResult> => {
  const url = `${lnbitsUrl}/api/v1/lnurlscan/${lnurl}`;
  const data = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });
  if (data.status !== 200) {
    console.error("data", await data.json());
    return { error: data.statusText, status: "failed" };
  }
  const rawResult = (await data.json()) as ScanResult;
  return rawResult;
};
