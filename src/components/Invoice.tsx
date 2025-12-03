import { Audio } from "react-loader-spinner";
import { handleWeblnPay, useWeblnAvailable } from "@/hooks/useWeblnAvailable";
import styles from "./Invoice.module.css";
import Qr from "./Qr";

type InvoiceProps = {
  invoice: string | null;
};

const Invoice = ({ invoice }: InvoiceProps) => {
  const { weblnAvailable, webLn, setWebln } = useWeblnAvailable();
  const handleCopy = () => {
    if (!invoice) return;
    console.log("copying", invoice);
    if (!navigator?.clipboard?.writeText(invoice)) {
      console.error("Failed to copy");
    }
  };
  return (
    <div className={styles.payment}>
      <Qr invoice={invoice} />
      <button
        type="button"
        className={styles.copy}
        onClick={() => handleCopy()}
      >
        Copy Invoice
      </button>
      {weblnAvailable && (
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.copy}
            onClick={() => handleWeblnPay(setWebln, invoice)}
          >
            Pay with WebLN
          </button>
          <Audio
            height="20"
            width="20"
            color="orange"
            ariaLabel="loading-webln"
            visible={webLn}
            wrapperClass={"audio"}
          />
        </div>
      )}
    </div>
  );
};
export default Invoice;
