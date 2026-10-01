import { useState } from "react";
import { Grid } from "react-loader-spinner";
import type { useConvexInvoice } from "@/hooks/useConvexInvoice";
import { handleWeblnPay, useWeblnAvailable } from "@/hooks/useWeblnAvailable";
import styles from "./Invoice.module.css";
import Qr from "./Qr";

const Invoice = ({
  payment,
}: {
  payment: ReturnType<typeof useConvexInvoice>;
}) => {
  const { weblnAvailable, setWebln } = useWeblnAvailable();
  const [message, setMessage] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const simulate = async () => {
    setPaying(true);
    try {
      const response = await fetch("/api/local/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: payment.checkoutId }),
      });
      if (!response.ok) throw new Error("Simulation failed");
      setMessage("Simulated payment received. Waiting for game confirmation.");
    } catch {
      setMessage("Could not simulate payment. Try again.");
    } finally {
      setPaying(false);
    }
  };
  const copy = async () => {
    if (!payment.invoice) return;
    try {
      await navigator.clipboard.writeText(payment.invoice);
      setMessage("Invoice copied");
    } catch {
      setMessage("Could not copy invoice");
    }
  };
  return (
    <div className={styles.payment}>
      {payment.invoice &&
        payment.bidAmount !== null &&
        payment.amount !== null && (
          <p>
            {payment.bidAmount.toLocaleString()} sats to the jackpot +{" "}
            {(payment.amount - payment.bidAmount).toLocaleString()} sats fees ={" "}
            {payment.amount.toLocaleString()} sats total.
          </p>
        )}
      {payment.error ? (
        <p role="alert">{payment.error}</p>
      ) : payment.invoice ? (
        payment.simulation ? (
          <>
            <p>
              <strong>Local payment simulation</strong>
              <br />
              No Bitcoin is sent or received.
            </p>
            <button
              type="button"
              className={styles.copy}
              disabled={paying}
              onClick={simulate}
            >
              Simulate payment
            </button>
          </>
        ) : (
          <>
            <Qr invoice={payment.invoice} />
            <button type="button" className={styles.copy} onClick={copy}>
              Copy Invoice
            </button>
            {weblnAvailable && (
              <button
                type="button"
                className={styles.copy}
                onClick={() => handleWeblnPay(setWebln, payment.invoice)}
              >
                Pay with WebLN
              </button>
            )}
          </>
        )
      ) : (
        <Grid height="80" width="80" color="orange" ariaLabel="qr-loading" />
      )}
      {message && <output>{message}</output>}
    </div>
  );
};
export default Invoice;
