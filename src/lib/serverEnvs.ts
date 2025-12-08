"server only";
import { verifyEnv } from "./publicEnvs";

export const LNBITS_API_KEY = verifyEnv(
  process.env.LNBITS_API_KEY_ADMIN,
  "LNBITS_API_KEY_ADMIN",
);
export const LNBITS_URL = verifyEnv(process.env.LNBITS_URL, "LNBITS_URL");
export const LND_HOST = verifyEnv(process.env.LND_HOST, "LND_HOST");
export const MACAROON = verifyEnv(process.env.MACAROON, "MACAROON");
export const PUSHER_APP_ID = verifyEnv(
  process.env.PUSHER_APP_ID,
  "PUSHER_APP_ID",
);

export const INVOICE_AMOUNT = verifyEnv(
  process.env.INVOICE_AMOUNT,
  "INVOICE_AMOUNT",
);
export const ZAPIER_WEBHOOK_URL = verifyEnv(
  process.env.ZAPIER_WEBHOOK_URL,
  "ZAPIER_WEBHOOK_URL",
  true,
);

export const PUSHER_APP_SECRET = verifyEnv(
  process.env.PUSHER_APP_SECRET,
  "PUSHER_APP_SECRET",
);

export const LOCAL_LN = verifyEnv(
  process.env.LOCAL_EN,
  "LOCAL_LN"
)