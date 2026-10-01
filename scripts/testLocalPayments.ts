import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

async function main() {
  const origin = `http://127.0.0.1:${process.env.LOCAL_PAYMENTS_PORT ?? "3000"}`;
  const client = new ConvexHttpClient(
    `http://127.0.0.1:${process.env.LOCAL_CONVEX_PORT ?? "3210"}`,
  );
  const settings = await client.query(api.invoices.settings, {});
  assert(
    settings.simulation,
    "Smoke test only runs against local payment simulation",
  );
  assert(
    (await client.query(api.games.getCurrent, {})).status === "WAITING",
    "Wait for the active local round to finish first",
  );
  const uuid = randomUUID();
  const address = `smoke-${uuid.slice(0, 8)}@example.test`;
  async function until<T>(
    read: () => Promise<T>,
    accepts: (value: T) => boolean,
    timeout: number,
  ) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await read();
      if (accepts(value)) return value;
      await delay(250);
    }
    throw new Error("Local payment smoke test timed out");
  }
  const invoiceId = await client.mutation(api.invoices.requestInvoice, {
    uuid,
    lnAddress: address,
  });
  const invoice = await until(
    () => client.query(api.invoices.getInvoiceState, { uuid }),
    (value) => value.status === "pending",
    20000,
  );
  assert(invoice.checkoutId);
  assert(invoice.invoiceId === invoiceId);
  async function pay() {
    const response = await fetch(`${origin}/api/local/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ checkoutId: invoice.checkoutId }),
    });
    assert.equal(response.status, 200);
  }
  await pay();
  await until(
    () => client.query(api.invoices.getInvoiceState, { uuid }),
    (value) => value.status === "settled",
    20000,
  );
  const game = await client.query(api.games.getCurrent, {});
  assert.equal(game.jackpot, settings.creditedAmount);
  assert.equal(game.lnAddress, address);
  await pay();
  await delay(1000);
  assert.deepEqual(
    await client.query(api.games.getCurrent, {}),
    game,
    "Duplicate receipt changed game state",
  );
  console.log(
    "PASS: invoice creation, server settlement without presence, and duplicate receipt",
  );
  async function getTransfers() {
    const response = await fetch(`${origin}/api/local/payments`);
    assert.equal(response.status, 200);
    const provider = await response.json();
    return Object.values(provider.payouts) as Array<{
      destination: string;
      amount: number;
      status: string;
    }>;
  }
  const payout = await until(
    async () => (await getTransfers()).find((value) => value.destination === address),
    (value) => value?.status === "succeeded",
    90000,
  );
  assert.equal(payout?.amount, game.winnerAmount);
  const transfers = await getTransfers();
  assert.equal(
    transfers.filter((value) => value.destination === address).length,
    1,
  );
  console.log(
    "PASS: timer expiry and exactly one confirmed simulated winner payout",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
