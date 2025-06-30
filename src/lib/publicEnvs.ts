export const verifyEnv = (
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

const NEXT_PUBLIC_PUSHER_APP_KEY = verifyEnv(
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
  "NEXT_PUBLIC_PUSHER_APP_KEY",
);
const NEXT_PUBLIC_PUSHER_APP_CLUSTER = verifyEnv(
  process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  "NEXT_PUBLIC_PUSHER_APP_CLUSTER",
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

export {
  NEXT_PUBLIC_PUSHER_APP_KEY,
  NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  NEXT_PUBLIC_PUSHER_CHANNEL,
  NEXT_PUBLIC_PRESENCE_CHANNEL,
  NEXT_PUBLIC_CLOCK_DURATION,
};
