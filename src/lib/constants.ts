const verifyEnv = (
  value: string | undefined,
  name: string,
  optional: boolean = false,
): string => {
  if (!value || typeof value !== "string") {
    if (optional) return "";
    throw new Error(`${name} is not set`);
  }
  return value;
};

const LNBITS_API_KEY = verifyEnv(
  process.env.LNBITS_API_KEY_ADMIN,
  "LNBITS_API_KEY_ADMIN",
);
const LNBITS_URL = verifyEnv(process.env.LNBITS_URL, "LNBITS_URL");
const LND_HOST = verifyEnv(process.env.LND_HOST, "LND_HOST");
const MACAROON = verifyEnv(process.env.MACAROON, "MACAROON");
const PUSHER_APP_ID = verifyEnv(process.env.PUSHER_APP_ID, "PUSHER_APP_ID");
const NEXT_PUBLIC_PUSHER_APP_KEY = verifyEnv(
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
  "NEXT_PUBLIC_PUSHER_APP_KEY",
);
const NEXT_PUBLIC_PUSHER_APP_CLUSTER = verifyEnv(
  process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  "NEXT_PUBLIC_PUSHER_APP_CLUSTER",
);
const PUSHER_APP_SECRET = verifyEnv(
  process.env.PUSHER_APP_SECRET,
  "PUSHER_APP_SECRET",
);
const NEXT_PUBLIC_PUSHER_CHANNEL = verifyEnv(
  process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
  "NEXT_PUBLIC_PUSHER_CHANNEL",
);
const NEXT_PUBLIC_PRESENCE_CHANNEL = verifyEnv(
  process.env.NEXT_PUBLIC_PRESENCE_CHANNEL,
  "NEXT_PUBLIC_PRESENCE_CHANNEL",
);
const NEXT_PUBLIC_CLOCK_DURATION = verifyEnv(
  process.env.NEXT_PUBLIC_CLOCK_DURATION,
  "NEXT_PUBLIC_CLOCK_DURATION",
);
const INVOICE_AMOUNT = verifyEnv(process.env.INVOICE_AMOUNT, "INVOICE_AMOUNT");
const ZAPIER_WEBHOOK_URL = verifyEnv(
  process.env.ZAPIER_WEBHOOK_URL,
  "ZAPIER_WEBHOOK_URL",
  true,
);

export {
  LNBITS_API_KEY,
  LNBITS_URL,
  LND_HOST,
  MACAROON,
  PUSHER_APP_ID,
  NEXT_PUBLIC_PUSHER_APP_KEY,
  NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  PUSHER_APP_SECRET,
  NEXT_PUBLIC_PUSHER_CHANNEL,
  NEXT_PUBLIC_PRESENCE_CHANNEL,
  NEXT_PUBLIC_CLOCK_DURATION,
  INVOICE_AMOUNT,
  ZAPIER_WEBHOOK_URL,
};
