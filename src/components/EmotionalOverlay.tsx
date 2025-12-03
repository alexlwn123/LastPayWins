"use client";

import { useEffect, useState } from "react";
import { fromSats } from "satcomma";
import styles from "./EmotionalOverlay.module.css";

export type EmotionalState =
  | "idle"
  | "bid_received"
  | "outbid"
  | "winner"
  | "expired"
  | "urgent";

type EmotionalOverlayProps = {
  state: EmotionalState;
  jackpot?: number;
  onComplete?: () => void;
};

type ConfettiPiece = {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
};

const CONFETTI_COLORS = [
  "#f7931a",
  "#ffd700",
  "#ff6b00",
  "#ffb347",
  "#ff8c00",
  "#ffa500",
];

const generateConfetti = (count: number): ConfettiPiece[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
  }));
};

const EmotionalOverlay = ({
  state,
  jackpot = 0,
  onComplete,
}: EmotionalOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (state === "idle") {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (state === "winner") {
      setConfetti(generateConfetti(50));
    }

    // Auto-dismiss after animation
    const duration =
      state === "winner"
        ? 5000
        : state === "outbid"
          ? 2000
          : state === "bid_received"
            ? 1500
            : state === "expired"
              ? 3000
              : 0;

    if (duration > 0) {
      const timeout = setTimeout(() => {
        setVisible(false);
        setConfetti([]);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [state, onComplete]);

  if (!visible || state === "idle") return null;

  return (
    <div
      className={`${styles.overlay} ${styles[state]}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Confetti for winner */}
      {state === "winner" && (
        <div className={styles.confettiContainer}>
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className={styles.confetti}
              style={{
                left: `${piece.x}%`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {state === "bid_received" && (
          <>
            <div className={styles.icon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className={styles.title}>Bid Received!</h2>
            <p className={styles.subtitle}>You&apos;re now in the lead</p>
          </>
        )}

        {state === "outbid" && (
          <>
            <div className={styles.icon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className={styles.title}>OUTBID!</h2>
            <p className={styles.subtitle}>Someone else has taken the lead</p>
          </>
        )}

        {state === "winner" && (
          <>
            <div className={styles.trophy}>🏆</div>
            <h2 className={styles.title}>WINNER!</h2>
            <div className={styles.jackpotDisplay}>
              <span className={styles.btcSymbol}>₿</span>
              <span className={styles.jackpotAmount}>{fromSats(jackpot)}</span>
            </div>
            <p className={styles.subtitle}>
              Congratulations! You won the jackpot!
            </p>
          </>
        )}

        {state === "expired" && (
          <>
            <div className={styles.icon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className={styles.title}>Time&apos;s Up!</h2>
            <p className={styles.subtitle}>
              The timer has expired. A winner has been declared!
            </p>
          </>
        )}
      </div>

      {/* Vignette effect for urgent state */}
      {state === "urgent" && <div className={styles.vignette} />}
    </div>
  );
};

export default EmotionalOverlay;
