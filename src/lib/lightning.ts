"server only";
import { Agent } from "node:https";
import fetch from "node-fetch";
import {
  LNBITS_API_KEY,
  LNBITS_URL,
  LND_HOST,
  LOCAL_LN,
  MACAROON,
} from "./serverEnvs";

type Invoice = { payment_request: string; r_hash: string };
// export type CreateInvoice = (
//   amount: number,
//   memo: string,
//   expiry: number,
// ) => Promise<{ invoice: string; rHash: string }>;
export type CheckInvoice = (rHash: string) => Promise<{ settled: boolean }>;

export const createLnbitsInvoice = async (
  amount: number,
  memo: string,
  expiry: number,
) => {
  if (LOCAL_LN) {
    return { payment_request: "lnbcFAKE_INVOICE", r_hash: "fakeHash" };
  }
  const url = `${LNBITS_URL}/api/v1/payments`;
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
      "x-api-key": LNBITS_API_KEY,
    },
    body: JSON.stringify(body),
  });
  return (await rawData.json()) as Invoice;
};

// export const checkLnbitsInvoice: CheckInvoice = async (paymentHash) => {
export const checkLnbitsInvoice = async (paymentHash) => {
  if (LOCAL_LN) {
    return { settled: false };
  }
  const url = `${LNBITS_URL}/api/v1/payments/${paymentHash}`;
  const rawData = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LNBITS_API_KEY,
    },
  });
  const res = (await rawData.json()) as { paid: boolean };
  return { settled: res.paid };
};

export const createLndInvoice = async (
  amount: number,
  memo: string,
  expiry: number,
) => {
  // ): Promise<Invoice> => {
  const url = `${LND_HOST}/v1/invoices`;
  const data = await fetch(url, {
    method: "POST",
    headers: {
      "Grpc-Metadata-macaroon": MACAROON,
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
  return await data.json();
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
  const url = `${LNBITS_URL}/api/v1/lnurlscan/${lnurl}`;
  const data = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LNBITS_API_KEY,
    },
  });
  if (data.status !== 200) {
    console.error("data", await data.json());
    return { error: data.statusText, status: "failed" };
  }
  const rawResult = (await data.json()) as ScanResult;
  return rawResult;
};
