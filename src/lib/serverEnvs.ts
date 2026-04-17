"server only";
import { verifyEnv } from "./publicEnvs";

export const CERT = verifyEnv(process.env.CERT, "CERT");
export const LND_HOST = verifyEnv(process.env.LND_HOST, "LND_HOST");
export const MACAROON = verifyEnv(process.env.MACAROON, "MACAROON");

export const INVOICE_AMOUNT = verifyEnv(
  process.env.INVOICE_AMOUNT,
  "INVOICE_AMOUNT",
);
