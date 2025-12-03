import {
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { NEXT_PUBLIC_CLOCK_DURATION } from "@/lib/publicEnvs";
import type { Status } from "@/types/payer";
import styles from "./Countdown.module.css";

const duration = parseInt(NEXT_PUBLIC_CLOCK_DURATION);

type CountdownProps = {
  lastPayerTimestamp: number;
  status: Status;
  setStatus: Dispatch<SetStateAction<Status>>;
  isWinning: boolean;
  displayingInvoice: boolean;
};

const Countdown = ({
  lastPayerTimestamp,
  status,
  setStatus,
  isWinning,
  displayingInvoice,
}: CountdownProps) => {
  const [remainingTime, setRemainingTime] = useState(duration);
  const isVisible = usePageVisibility();
  
  // Motion values for smooth animation
  const timeValue = useMotionValue(duration);
  const progress = useTransform(timeValue, [duration, 0], [0, 1]);
  
  // Circle properties
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useTransform(progress, (p) => circumference * p);
  
  // Color interpolation
  const color = useTransform(
    timeValue,
    [duration, duration * 0.5, duration * 0.2, 0],
    ["#39ff14", "#ffd700", "#ff2a2a", "#ff2a2a"]
  );

  // Sync logic
  useEffect(() => {
    let animationControl: number;

    const updateTimer = () => {
      if (status === "LIVE") {
        const now = Date.now();
        const elapsed = (now - lastPayerTimestamp) / 1000;
        const currentRemaining = Math.max(duration - elapsed, 0);
        
        setRemainingTime(currentRemaining);
        timeValue.set(currentRemaining);

        if (currentRemaining <= 0) {
           setStatus(isWinning ? "WINNER" : "EXPIRED");
        } else {
           // Continue animation
           animationControl = requestAnimationFrame(updateTimer);
        }
      } else {
        // Reset
        setRemainingTime(duration);
        timeValue.set(duration);
      }
    };

    if (isVisible) {
      updateTimer();
    }

    return () => {
      if (animationControl) cancelAnimationFrame(animationControl);
    };
  }, [isVisible, status, lastPayerTimestamp, isWinning, setStatus, timeValue]);

  // Heartbeat effect when critical
  const isCritical = remainingTime < 10 && status === "LIVE";

  return (
    <div className={styles.timerWrapper}>
      <motion.div 
        className={styles.ringContainer}
        animate={isCritical ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={isCritical ? { repeat: Infinity, duration: 0.5 } : {}}
      >
        <svg className={styles.svg} viewBox="0 0 260 260" aria-label="Countdown Timer">
          <circle
            className={styles.track}
            cx="130"
            cy="130"
            r={radius}
          />
          <motion.circle
            className={styles.indicator}
            cx="130"
            cy="130"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className={styles.timeDisplay}>
            {status === "LIVE" ? (
                <>
                    <motion.div 
                        className={styles.value}
                        style={{ color }}
                    >
                        {Math.ceil(remainingTime)}
                    </motion.div>
                    <div className={styles.label}>SECONDS</div>
                </>
            ) : (
                <div className={styles.expired}>
                    {status === "LOADING" ? "..." : status === "EXPIRED" ? "0" : "WIN"}
                </div>
            )}
        </div>
      </motion.div>

      {displayingInvoice ? (
        <p className={styles.subtext}>
          Pay to {status === "LIVE" ? "reset" : "start"} the Timer
        </p>
      ) : (
        <p className={styles.subtext}>Enter Lightning Address to Play</p>
      )}
    </div>
  );
};

export default Countdown;
