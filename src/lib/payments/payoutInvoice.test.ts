// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
const mock = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./publicJson", () => ({ publicJson: mock.read }));
import { payoutInvoice } from "./payoutInvoice";
import { payoutMemo } from "./payoutMemo";
const details = {
  tag: "payRequest",
  callback: "https://wallet.example/pay?token=abc",
  minSendable: 1000,
  maxSendable: 100000000,
  commentAllowed: 200,
};
beforeEach(() => vi.resetAllMocks());

test("requests the full prize in millisats and restores the congratulations comment", async () => {
  mock.read
    .mockResolvedValueOnce(details)
    .mockResolvedValueOnce({ pr: "lnbc123abc" });
  const memo = payoutMemo("prize", 19590);
  expect(memo).toBe(
    "Congratulations! You've won the 19590 satoshi jackpot from LastPayWins!",
  );
  expect(await payoutInvoice("alice@wallet.example", 19590, memo)).toEqual({
    paymentRequest: "lnbc123abc",
  });
  const url = mock.read.mock.calls[1][0] as URL;
  expect(url.searchParams.get("amount")).toBe("19590000");
  expect(url.searchParams.get("comment")).toBe(memo);
  expect(url.searchParams.get("token")).toBe("abc");
});

test.each([undefined, 0, 12])(
  "respects the recipient's comment limit (%s)",
  async (limit) => {
    mock.read
      .mockResolvedValueOnce({ ...details, commentAllowed: limit })
      .mockResolvedValueOnce({ pr: "lnbc123abc" });
    await payoutInvoice(
      "alice@wallet.example",
      100,
      "Congratulations! You won!",
    );
    const url = mock.read.mock.calls[1][0] as URL;
    expect(url.searchParams.get("comment")).toBe(
      limit ? "Congratulations! You won!".slice(0, limit) : null,
    );
  },
);

test("does not request an invoice outside the recipient's amount limits", async () => {
  mock.read.mockResolvedValueOnce({ ...details, maxSendable: 1000 });
  await expect(
    payoutInvoice("alice@wallet.example", 100, "Hello"),
  ).rejects.toThrow("supported range");
  expect(mock.read).toHaveBeenCalledTimes(1);
});
