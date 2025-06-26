import { Audio } from "react-loader-spinner";
import { handleWeblnPay, useWeblnAvailable } from "@/hooks/useWeblnAvailable";
import styles from "./Invoice.module.css";
import Qr from "./Qr";

const Invoice = ({ invoice }) => {
  const { weblnAvailable, webLn, setWebln } = useWeblnAvailable();
  return (
    <div className={styles.payment}>
      <Qr invoice={invoice} />
      <button
        type="button"
        className={styles.copy}
        onClick={() => {
          console.log("copying", invoice);
          navigator?.clipboard?.writeText(invoice) ??
            console.error("Failed to copy");
        }}
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
