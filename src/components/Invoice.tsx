import styles from "./Invoice.module.css";
import Qr from "./Qr";
import { Audio } from "react-loader-spinner";
import { useWeblnAvailable, handleWeblnPay } from "@/hooks/useWeblnAvailable";

const Invoice = ({ invoice, toast }) => {
  const { weblnAvailable, webLn, setWebln } = useWeblnAvailable();
  return (
    <div className={styles.payment}>
      <Qr invoice={invoice} />
      <button
        className={styles.copy}
        onClick={() =>
          navigator?.clipboard?.writeText(invoice) ??
          console.error("Failed to copy")
        }
      >
        Copy Invoice
      </button>
      {weblnAvailable && (
        <div className={styles.buttonRow}>
          <button
            className={styles.copy}
            onClick={() => handleWeblnPay(setWebln, toast, invoice)}
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
