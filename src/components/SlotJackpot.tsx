"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fromSats } from "satcomma";
import styles from "./SlotJackpot.module.css";

type SlotJackpotProps = {
  jackpotSats: number;
  isActive?: boolean;
};

type SlotDigitProps = {
  digit: string;
  isAnimating: boolean;
  delay: number;
};

const SlotDigit = ({ digit, isAnimating, delay }: SlotDigitProps) => {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (isAnimating && digit !== displayDigit) {
      setSpinning(true);
      const spinDuration = 300 + delay;

      const timeout = setTimeout(() => {
        setDisplayDigit(digit);
        setSpinning(false);
      }, spinDuration);

      return () => clearTimeout(timeout);
    } else if (!isAnimating) {
      setDisplayDigit(digit);
    }
  }, [digit, isAnimating, delay, displayDigit]);

  const isNumber = /\d/.test(digit);
  const isSeparator = digit === "," || digit === ".";

  return (
    <div
      className={`${styles.digitContainer} ${isNumber ? styles.number : ""} ${isSeparator ? styles.separator : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`${styles.digit} ${spinning ? styles.spinning : ""}`}>
        <span className={styles.digitValue}>{displayDigit}</span>
        {spinning && (
          <div className={styles.spinReel}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <span key={`reel-digit-${num}`} className={styles.reelDigit}>
                {(Number.parseInt(displayDigit) + num) % 10}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SlotJackpot = ({
  jackpotSats = 0,
  isActive = true,
}: SlotJackpotProps) => {
  const prevJackpot = useRef(jackpotSats);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sanitize input
  const safeJackpot =
    typeof jackpotSats === "number" && !Number.isNaN(jackpotSats)
      ? jackpotSats
      : 0;

  const formattedJackpot = useMemo(() => {
    return fromSats(safeJackpot);
  }, [safeJackpot]);

  const digits = useMemo(() => {
    return formattedJackpot.split("");
  }, [formattedJackpot]);

  useEffect(() => {
    if (prevJackpot.current !== safeJackpot && safeJackpot > 0) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
        prevJackpot.current = safeJackpot;
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [safeJackpot]);

  return (
    <div
      className={`${styles.jackpotWrapper} ${isActive ? styles.active : styles.inactive}`}
    >
      <div className={styles.label}>JACKPOT</div>
      <div className={`${styles.jackpot} ${isAnimating ? styles.updated : ""}`}>
        <span className={styles.bitcoinSymbol}>₿</span>
        <div className={styles.digitsContainer}>
          {digits.map((digit, index) => (
            <SlotDigit
              key={`${index}-${digits.length}`}
              digit={digit}
              isAnimating={isAnimating}
              delay={index * 50}
            />
          ))}
        </div>
      </div>
      <div className={styles.satsLabel}>
        {safeJackpot.toLocaleString()} sats
      </div>
      <div className={styles.glowOrb} />
    </div>
  );
};

export default SlotJackpot;
