"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { NEXT_PUBLIC_CLOCK_DURATION } from "@/lib/publicEnvs";
import type { Status } from "@/types/payer";
import styles from "./DramaticCountdown.module.css";

const duration = parseInt(NEXT_PUBLIC_CLOCK_DURATION);

type DramaticCountdownProps = {
  lastPayerTimestamp: number;
  countdownKey: number;
  setCountdownKey: Dispatch<SetStateAction<number>>;
  status: Status;
  setStatus: Dispatch<SetStateAction<Status>>;
  isWinning: boolean;
  displayingInvoice: boolean;
  onUrgent?: (isUrgent: boolean) => void;
  onTick?: (remaining: number) => void;
};

const DramaticCountdown = ({
  lastPayerTimestamp,
  countdownKey,
  setCountdownKey,
  status,
  setStatus,
  isWinning,
  displayingInvoice,
  onUrgent,
  onTick,
}: DramaticCountdownProps) => {
  const [remainingTime, setRemainingTime] = useState(duration);
  const isVisible = usePageVisibility();

  const isPlaying = isVisible && status === "LIVE";
  const isUrgent = remainingTime <= 10 && remainingTime > 0;
  const isCritical = remainingTime <= 5 && remainingTime > 0;

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    return (remainingTime / duration) * 100;
  }, [remainingTime]);

  // Determine color based on time remaining
  const timerColor = useMemo(() => {
    if (remainingTime <= 5) return "var(--danger)";
    if (remainingTime <= 10) return "var(--warning)";
    if (remainingTime <= Math.floor(duration * 0.5))
      return "var(--bitcoin-orange)";
    return "var(--bitcoin-orange)";
  }, [remainingTime]);

  // Calculate initial time on mount or when key changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: countdownKey triggers recalculation intentionally
  useEffect(() => {
    if (status === "LIVE" && isVisible) {
      const timeRemaining =
        (duration * 1000 + lastPayerTimestamp - Date.now()) / 1000;
      if (timeRemaining <= 0) {
        setStatus(isWinning ? "WINNER" : "EXPIRED");
        setRemainingTime(duration);
      } else {
        setRemainingTime(Math.ceil(timeRemaining));
      }
    } else if (status !== "LIVE") {
      setRemainingTime(duration);
    }
  }, [
    countdownKey,
    isVisible,
    status,
    lastPayerTimestamp,
    isWinning,
    setStatus,
  ]);

  // Countdown tick
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          setStatus(isWinning ? "WINNER" : "EXPIRED");
          setCountdownKey((k) => k + 1);
          return duration;
        }
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isWinning, setStatus, setCountdownKey, onTick]);

  // Notify parent of urgency state
  useEffect(() => {
    onUrgent?.(isUrgent);
  }, [isUrgent, onUrgent]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return secs.toString();
  };

  const urgencyClass = isCritical
    ? styles.critical
    : isUrgent
      ? styles.urgent
      : "";

  return (
    <div
      className={`${styles.countdownWrapper} ${urgencyClass} ${status !== "LIVE" ? styles.inactive : ""}`}
    >
      {/* Progress Ring */}
      <svg
        className={styles.progressRing}
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          className={styles.trackCircle}
          cx="100"
          cy="100"
          r="90"
          fill="none"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          className={styles.progressCircle}
          cx="100"
          cy="100"
          r="90"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          style={{
            stroke: timerColor,
            strokeDasharray: `${2 * Math.PI * 90}`,
            strokeDashoffset: `${2 * Math.PI * 90 * (1 - progressPercent / 100)}`,
          }}
        />
        {/* Glow effect on progress */}
        <circle
          className={styles.glowCircle}
          cx="100"
          cy="100"
          r="90"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          style={{
            stroke: timerColor,
            strokeDasharray: `${2 * Math.PI * 90}`,
            strokeDashoffset: `${2 * Math.PI * 90 * (1 - progressPercent / 100)}`,
            filter: `blur(8px)`,
            opacity: 0.5,
          }}
        />
      </svg>

      {/* Timer display */}
      <div className={styles.timerContent}>
        <div className={styles.timerLabel}>
          {status === "LIVE" ? "TIME LEFT" : "WAITING"}
        </div>
        <div
          className={`${styles.timerValue} ${isCritical ? styles.shake : ""}`}
          style={{ color: timerColor }}
        >
          {status === "LIVE" ? formatTime(remainingTime) : "--"}
        </div>
        <div className={styles.timerUnit}>
          {remainingTime === 1 ? "SECOND" : "SECONDS"}
        </div>
      </div>

      {/* Instruction text */}
      <p className={styles.instruction}>
        {displayingInvoice
          ? status === "LIVE"
            ? "Pay to reset the timer"
            : "Pay to start the game"
          : "Enter your Lightning Address below"}
      </p>

      {/* Urgency effects */}
      {isCritical && <div className={styles.criticalOverlay} />}
      {isUrgent && !isCritical && <div className={styles.urgentPulse} />}
    </div>
  );
};

export default DramaticCountdown;
