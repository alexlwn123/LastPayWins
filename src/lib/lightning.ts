import fetch from "node-fetch";
import { Agent } from "https";

type Invoice = { payment_request: string; r_hash: string };
// export type CreateInvoice = (amount: number, memo: string, expiry: number) => Promise<{ invoice: string; rHash: string }>;
export type CheckInvoice = (rHash: string) => Promise<{ settled: boolean }>;

export const createLnbitsInvoice: CreateInvoice = async (
	amount,
	memo,
	expiry,
) => {
	const url = `${process.env.LNBITS_URL!}/api/v1/payments`;
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
			"x-api-key": process.env.LNBITS_API_KEY_ADMIN!,
		},
		body: JSON.stringify(body),
	});
	const data = await rawData.json();
	return { invoice: data.payment_request, rHash: data.payment_hash };
};

export const checkLnbitsInvoice: CheckInvoice = async (paymentHash) => {
	const url = `${process.env.LNBITS_URL!}/api/v1/payments/${paymentHash}`;
	const rawData = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": process.env.LNBITS_API_KEY_ADMIN!,
		},
	});
	const data = await rawData.json();
	return { settled: data.paid };
};

export const createLndInvoice = async (
	amount: number,
	memo: string,
	expiry: number,
): Promise<Invoice> => {
	const url = `${process.env.LND_HOST}/v1/invoices`;
	const data = await fetch(url, {
		method: "POST",
		headers: {
			"Grpc-Metadata-macaroon": process.env.MACAROON!,
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
	const url = `${process.env.LNBITS_URL!}/api/v1/lnurlscan/${lnurl}`;
	const data = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": process.env.LNBITS_API_KEY!,
		},
	});
	if (data.status !== 200) {
		console.error("data", await data.json());
		return { error: data.statusText, status: "failed" };
	}
	const rawResult = (await data.json()) as ScanResult;
	return rawResult;
};
