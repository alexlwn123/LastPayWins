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

export const NEXT_PUBLIC_CLOCK_DURATION = verifyEnv(
  process.env.NEXT_PUBLIC_CLOCK_DURATION,
  "NEXT_PUBLIC_CLOCK_DURATION",
);

export const NEXT_PUBLIC_CONVEX_URL = verifyEnv(
  process.env.NEXT_PUBLIC_CONVEX_URL,
  "NEXT_PUBLIC_CONVEX_URL",
);
