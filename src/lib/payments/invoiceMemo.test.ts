// @vitest-environment node
import { MoneyDevKitNode } from "@moneydevkit/core";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

test.each([false, true])(
  "the SDK forwards the configured memo when minting (override: %s)",
  (override) => {
    const memo = "Bid - Last Pay Wins — +2% for MDK routing fee";
    vi.stubEnv("MDK_INVOICE_DESCRIPTION", override ? memo : "");
    const minted = {
      bolt11: "invoice",
      paymentHash: "hash",
      expiresAt: 123,
      scid: "scid",
    };
    const native = {
      getInvoiceWhileRunning: vi.fn().mockReturnValue(minted),
      getVariableAmountJitInvoiceWhileRunning: vi.fn().mockReturnValue(minted),
    };
    // Exercise the installed SDK adapter without constructing a real Lightning node.
    const node: MoneyDevKitNode = Object.create(MoneyDevKitNode.prototype);
    Object.defineProperty(node, "node", { value: native });
    expect(node.createInvoiceNow(10200000, "mdk invoice", 300)).toEqual(minted);
    expect(native.getInvoiceWhileRunning).toHaveBeenCalledWith(
      10200000,
      override ? memo : "mdk invoice",
      300,
    );
    expect(node.createInvoiceNow(null, "mdk invoice", 300)).toEqual(minted);
    expect(native.getVariableAmountJitInvoiceWhileRunning).toHaveBeenCalledWith(
      override ? memo : "mdk invoice",
      300,
    );
  },
);
