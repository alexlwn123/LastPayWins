import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const configFile = ".env.payments.local";
if (!existsSync(configFile))
  writeFileSync(
    configFile,
    `PAYMENT_BRIDGE_SECRET=${randomBytes(32).toString("hex")}\n`,
    { mode: 0o600 },
  );
const secrets = parseEnv(readFileSync(configFile, "utf8"));
const live = process.argv.includes("--mdk");
function localPort(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535)
    throw new Error(`${name} must be an integer from 1024 to 65535`);
  return value;
}
const port = localPort("LOCAL_PAYMENTS_PORT", 3000);
const convexPort = localPort("LOCAL_CONVEX_PORT", 3210);
const convexSitePort = localPort("LOCAL_CONVEX_SITE_PORT", 3211);
if (new Set([port, convexPort, convexSitePort]).size !== 3)
  throw new Error("The app, Convex API, and Convex HTTP ports must be distinct");
const origin = `http://127.0.0.1:${port}`;
if (live && existsSync(".local-payments/state.json")) {
  throw new Error(
    "Use a separate clean checkout and local database for real MDK tests; this checkout contains simulated payments",
  );
}
const mdk = existsSync(".env.mdk.local")
  ? parseEnv(readFileSync(".env.mdk.local", "utf8"))
  : {};
if (
  live &&
  (!mdk.MDK_ACCESS_TOKEN || !mdk.MDK_MNEMONIC || !mdk.MDK_WEBHOOK_SECRET)
) {
  throw new Error(
    "Set development MDK credentials in .env.mdk.local before running with --mdk",
  );
}
const env = {
  ...process.env,
  ...(live ? mdk : {}),
  ...secrets,
  CONVEX_AGENT_MODE: "anonymous",
  CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS:
    process.env.CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS ?? "120",
  CONVEX_DEPLOYMENT: "",
  CONVEX_DEPLOY_KEY: "",
  CONVEX_SELF_HOSTED_URL: "",
  CONVEX_SELF_HOSTED_ADMIN_KEY: "",
  NEXT_PUBLIC_CONVEX_URL: `http://127.0.0.1:${convexPort}`,
  NEXT_PUBLIC_CONVEX_SITE_URL: `http://127.0.0.1:${convexSitePort}`,
  CONVEX_SITE_URL: `http://127.0.0.1:${convexSitePort}`,
  PAYMENT_BRIDGE_URL: origin,
  PAYMENT_MODE: live ? "mdk" : "simulation",
  LOCAL_PAYMENTS: "true",
  PAYMENTS_ENABLED: "true",
  PAYMENT_NOTIFICATIONS_ENABLED: "false",
  INVOICE_AMOUNT: "100",
  NEXT_PUBLIC_CLOCK_DURATION: "60",
  MDK_FEE_RESERVE_BPS: "200",
  PAYOUT_RESERVE_SATS_PER_BID: "5",
  MDK_PREVIEW: "",
  NEXT_PUBLIC_MDK_PREVIEW: "",
};
// The local backend selection is explicit; this command never selects a cloud project.
const backend = spawn(
  "pnpm",
  ["exec", "convex", "dev", "--tail-logs", "disable",
    "--local-cloud-port", String(convexPort),
    "--local-site-port", String(convexSitePort)],
  { env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
let frontend: ChildProcess | undefined;
let initialized = false;
let stopping = false;
async function ready(chunk) {
  process.stdout.write(chunk);
  if (initialized || !chunk.toString().includes("Convex functions ready"))
    return;
  initialized = true;
  const deployment = parseEnv(
    readFileSync(".env.local", "utf8"),
  ).CONVEX_DEPLOYMENT;
  if (!deployment?.startsWith("anonymous:"))
    throw new Error("Expected an isolated anonymous local Convex deployment");
  const localEnv = { ...env, CONVEX_DEPLOYMENT: deployment };
  for (const key of [
    "PAYMENT_BRIDGE_SECRET",
    "PAYMENT_BRIDGE_URL",
    "PAYMENT_MODE",
    "LOCAL_PAYMENTS",
    "PAYMENTS_ENABLED",
    "PAYMENT_NOTIFICATIONS_ENABLED",
    "INVOICE_AMOUNT",
    "NEXT_PUBLIC_CLOCK_DURATION",
    "MDK_FEE_RESERVE_BPS",
    "PAYOUT_RESERVE_SATS_PER_BID",
  ]) {
    const result = spawnSync(
      "pnpm",
      ["exec", "convex", "env", "set", key, env[key]],
      { env: localEnv, encoding: "utf8" },
    );
    if (result.status !== 0) {
      console.error(`Could not configure local Convex variable ${key}`);
      stop();
      process.exitCode = 1;
      return;
    }
  }
  frontend = spawn(
    "pnpm",
    ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { env, detached: true, stdio: "inherit" },
  );
  frontend.on("exit", (code) => {
    if (!stopping && code) process.exitCode = code;
    stop();
  });
  console.log(
    `Local payment mode: ${env.PAYMENT_MODE}. Production is untouched.`,
  );
}
backend.stdout.on("data", ready);
backend.stderr.on("data", ready);
backend.on("exit", (code) => {
  if (!stopping && code) process.exitCode = code;
  stop();
});
function terminate(child: ChildProcess | undefined) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}
function stop() {
  if (stopping) return;
  stopping = true;
  terminate(backend);
  terminate(frontend);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
