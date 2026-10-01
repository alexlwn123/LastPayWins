import "server-only";
import { z } from "zod";
import { getLightningAddressUrl } from "../lightning";
import { publicJson } from "./publicJson";

const payRequest = z.object({
  tag: z.literal("payRequest"),
  callback: z.string().url(),
  minSendable: z.number().int().nonnegative(),
  maxSendable: z.number().int().nonnegative(),
  commentAllowed: z.number().int().nonnegative().optional(),
});

export async function payoutInvoice(
  destination: string,
  amount: number,
  comment: string,
) {
  const { url } = getLightningAddressUrl(destination);
  const lnurl = payRequest.parse(await publicJson(new URL(url)));
  const msats = amount * 1000;
  if (
    !Number.isSafeInteger(msats) ||
    msats < lnurl.minSendable ||
    msats > lnurl.maxSendable
  )
    throw new Error("Payout is outside the recipient's supported range");
  const callback = new URL(lnurl.callback);
  callback.searchParams.set("amount", String(msats));
  callback.searchParams.delete("comment");
  if (lnurl.commentAllowed)
    callback.searchParams.set(
      "comment",
      Array.from(comment)
        .slice(0, Math.min(lnurl.commentAllowed, 500))
        .join(""),
    );
  const invoice = z
    .object({
      pr: z
        .string()
        .max(4096)
        .regex(/^lnbc[0-9a-z]+$/i),
    })
    .parse(await publicJson(callback));
  return { paymentRequest: invoice.pr };
}
