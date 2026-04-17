"use node";

import { Agent } from "node:https";
import fetch from "node-fetch";

const CERT = process.env.LND_CERT ?? process.env.CERT ?? "";
const LND_HOST = process.env.LND_HOST!;
const MACAROON = process.env.MACAROON!;

type LndInvoice = {
  payment_request: string;
  r_hash: string;
};

type LndLookupInvoice = {
  settled?: boolean;
  state?: string;
};

type LnurlPayResponse = {
  callback: string;
  commentAllowed?: number;
  maxSendable: number;
  metadata: string;
  minSendable: number;
  tag?: string;
};

type LnurlInvoiceResponse = {
  pr?: string;
  reason?: string;
  status?: string;
};

type ScanResult =
  | {
      status: "OK";
      callback: string;
      commentAllowed?: number;
      maxSendable: number;
      metadata: string;
      minSendable: number;
    }
  | { error: string; status: "failed" };

const lndAgent = new Agent(
  CERT
    ? {
        ca: CERT.includes("BEGIN CERTIFICATE")
          ? CERT
          : Buffer.from(CERT, "base64"),
      }
    : {
        rejectUnauthorized: false,
      },
);

const isLocalhost = (host: string) =>
  host.startsWith("localhost") ||
  host.startsWith("127.0.0.1") ||
  host.startsWith("0.0.0.0") ||
  host.endsWith(".local");

const getLightningAddressUrl = (address: string) => {
  const [name, host] = address.trim().toLowerCase().split("@");
  if (!name || !host) {
    throw new Error("Invalid lightning address");
  }

  const protocol = isLocalhost(host) ? "http" : "https";
  return `${protocol}://${host}/.well-known/lnurlp/${encodeURIComponent(name)}`;
};

const lndFetch = async <T>(path: string, init?: Parameters<typeof fetch>[1]) => {
  const response = await fetch(`${LND_HOST}${path}`, {
    ...init,
    agent: lndAgent,
    headers: {
      "Content-Type": "application/json",
      "Grpc-Metadata-macaroon": MACAROON,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `LND request failed: ${response.status} ${response.statusText} - ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
};

const toBase64PaymentHash = (paymentHash: string) => {
  if (/^[0-9a-fA-F]{64}$/.test(paymentHash)) {
    return Buffer.from(paymentHash, "hex").toString("base64");
  }

  const normalized = paymentHash.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized.length % 4 === 0
      ? normalized
      : normalized.padEnd(normalized.length + (4 - (normalized.length % 4)), "=");

  return padded;
};

const readLnurl = async (lnAddress: string): Promise<ScanResult> => {
  try {
    const response = await fetch(getLightningAddressUrl(lnAddress), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { error: response.statusText, status: "failed" };
    }

    const result = (await response.json()) as
      | (LnurlPayResponse & { status?: string; reason?: string })
      | { status?: string; reason?: string };

    if (
      "status" in result &&
      result.status === "ERROR" &&
      typeof result.reason === "string"
    ) {
      return { error: result.reason, status: "failed" };
    }

    if (
      !("callback" in result) ||
      !("minSendable" in result) ||
      !("maxSendable" in result) ||
      !("metadata" in result) ||
      result.tag !== "payRequest"
    ) {
      return { error: "Invalid lightning address response", status: "failed" };
    }

    return {
      callback: result.callback,
      commentAllowed: result.commentAllowed,
      maxSendable: result.maxSendable,
      metadata: result.metadata,
      minSendable: result.minSendable,
      status: "OK",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      status: "failed",
    };
  }
};

const getLnurlInvoice = async (
  lnAddress: string,
  amountMsats: number,
  comment?: string,
) => {
  const lnurl = await readLnurl(lnAddress);
  if (lnurl.status === "failed") {
    throw new Error(lnurl.error);
  }

  if (amountMsats < lnurl.minSendable || amountMsats > lnurl.maxSendable) {
    throw new Error("Requested amount is outside the allowed LNURL pay range");
  }

  const callbackUrl = new URL(lnurl.callback);
  callbackUrl.searchParams.set("amount", amountMsats.toString());

  if (comment && lnurl.commentAllowed && lnurl.commentAllowed > 0) {
    callbackUrl.searchParams.set("comment", comment.slice(0, lnurl.commentAllowed));
  }

  const response = await fetch(callbackUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch LNURL invoice: ${response.status} ${response.statusText}`,
    );
  }

  const invoice = (await response.json()) as LnurlInvoiceResponse;
  if (!invoice.pr) {
    throw new Error(invoice.reason ?? "LNURL callback did not return an invoice");
  }

  return invoice.pr;
};

const payInvoice = async (paymentRequest: string, maxFee: number) => {
  const result = await lndFetch<{
    payment_error?: string;
    payment_hash?: string;
    payment_preimage?: string;
  }>("/v1/channels/transactions", {
    method: "POST",
    body: JSON.stringify({
      fee_limit: {
        fixed: maxFee.toString(),
      },
      payment_request: paymentRequest,
    }),
  });

  if (result.payment_error) {
    throw new Error(result.payment_error);
  }

  return result;
};

export const createLndInvoice = async (
  amount: number,
  memo: string,
  expiry: number,
) => {
  const invoice = await lndFetch<LndInvoice>("/v1/invoices", {
    method: "POST",
    body: JSON.stringify({
      expiry,
      memo,
      value: amount,
    }),
  });

  return {
    paymentHash: invoice.r_hash,
    paymentRequest: invoice.payment_request,
  };
};

export const checkLndInvoice = async (paymentHash: string) => {
  const invoice = await lndFetch<LndLookupInvoice>(
    `/v2/invoices/lookup?payment_hash=${encodeURIComponent(toBase64PaymentHash(paymentHash))}`,
    {
      method: "GET",
    },
  );

  return {
    settled: invoice.state === "SETTLED" || invoice.settled === true,
  };
};

export const payLightningAddress = async (
  lnAddress: string,
  amountSats: number,
  comment?: string,
) => {
  const paymentRequest = await getLnurlInvoice(lnAddress, amountSats * 1000, comment);
  const maxFee = Math.max(5, Math.ceil(amountSats * 0.01));
  return await payInvoice(paymentRequest, maxFee);
};
