"server only";
import { verifyEnv } from "./publicEnvs";

export const LNBITS_API_KEY = verifyEnv(
  process.env.LNBITS_API_KEY_ADMIN,
  "LNBITS_API_KEY_ADMIN",
);
export const LNBITS_URL = verifyEnv(process.env.LNBITS_URL, "LNBITS_URL");
export const LND_HOST = verifyEnv(process.env.LND_HOST, "LND_HOST");
export const MACAROON = verifyEnv(process.env.MACAROON, "MACAROON");

export const INVOICE_AMOUNT = verifyEnv(
  process.env.INVOICE_AMOUNT,
  "INVOICE_AMOUNT",
);
