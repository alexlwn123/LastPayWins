"use client";

import styles from "./InvoiceToggle.module.css";

type InvoiceToggleProps = {
  isOpen: boolean;
  onToggle: () => void;
  hasInvoice: boolean;
};

const InvoiceToggle = ({
  isOpen,
  onToggle,
  hasInvoice,
}: InvoiceToggleProps) => {
  if (!hasInvoice) return null;

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isOpen ? styles.open : ""}`}
      onClick={onToggle}
      aria-label={isOpen ? "Close payment panel" : "Open payment panel"}
      aria-expanded={isOpen}
    >
      <div className={styles.content}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
        </svg>
        <span className={styles.label}>PAY</span>
      </div>
      <div className={styles.pulse} />
    </button>
  );
};

export default InvoiceToggle;
