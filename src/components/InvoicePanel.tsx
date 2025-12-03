"use client";

import { useEffect, useState } from "react";
import { useQRCode } from "next-qrcode";
import { Audio } from "react-loader-spinner";
import { handleWeblnPay, useWeblnAvailable } from "@/hooks/useWeblnAvailable";
import styles from "./InvoicePanel.module.css";

type InvoicePanelProps = {
  invoice: string | null;
  isOpen: boolean;
  onClose: () => void;
};

const InvoicePanel = ({ invoice, isOpen, onClose }: InvoicePanelProps) => {
  const { weblnAvailable, webLn, setWebln } = useWeblnAvailable();
  const { Canvas } = useQRCode();
  const [copied, setCopied] = useState(false);

  const text = invoice ? `lightning:${invoice}` : "";

  const handleCopy = async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Handle escape key globally when panel is open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.visible : ""}`}
        onClick={onClose}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close invoice panel"
      />

      {/* Panel */}
      <div
        className={`${styles.panel} ${isOpen ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Invoice panel"
      >
        {/* Close button */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close panel"
        >
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.content}>
          <h3 className={styles.title}>Scan to Pay</h3>
          <p className={styles.subtitle}>
            Scan the QR code with your Lightning wallet
          </p>

          {/* QR Code */}
          <div className={styles.qrContainer}>
            {invoice ? (
              <a href={text} className={styles.qrLink}>
                <Canvas
                  text={text}
                  options={{
                    errorCorrectionLevel: "L",
                    margin: 2,
                    scale: 4,
                    width: 240,
                    color: {
                      dark: "#0a0a0a",
                      light: "#f7931a",
                    },
                  }}
                />
              </a>
            ) : (
              <div className={styles.qrLoading}>
                <Audio
                  height="40"
                  width="40"
                  color="var(--bitcoin-orange)"
                  ariaLabel="Loading invoice"
                  visible={true}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.copyButton} ${copied ? styles.copied : ""}`}
              onClick={handleCopy}
              disabled={!invoice}
            >
              {copied ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Invoice
                </>
              )}
            </button>

            {weblnAvailable && (
              <button
                type="button"
                className={`${styles.button} ${styles.weblnButton}`}
                onClick={() => handleWeblnPay(setWebln, invoice)}
                disabled={!invoice || webLn}
              >
                {webLn ? (
                  <Audio
                    height="18"
                    width="18"
                    color="var(--bg-primary)"
                    ariaLabel="Processing payment"
                    visible={true}
                  />
                ) : (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Pay with WebLN
                  </>
                )}
              </button>
            )}
          </div>

          <p className={styles.hint}>
            Press <kbd>ESC</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
};

export default InvoicePanel;
