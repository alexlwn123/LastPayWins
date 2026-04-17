import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { NEXT_PUBLIC_CLOCK_DURATION } from "@/lib/publicEnvs";
import type { GameStatus } from "@/types/payer";
import styles from "./Countdown.module.css";

const duration = parseInt(NEXT_PUBLIC_CLOCK_DURATION);

type CountdownProps = {
  lastPayerTimestamp: number;
  countdownKey: number;
  setCountdownKey: Dispatch<SetStateAction<number>>;
  status: GameStatus;
  displayingInvoice: boolean;
};

type RenderTimeProps = {
  remainingTime: number;
  color: string;
};

const Countdown = ({
  lastPayerTimestamp,
  countdownKey,
  setCountdownKey,
  status,
  displayingInvoice,
}: CountdownProps) => {
  const [initialTimeRemaining, setInitialTimeRemaining] = useState(duration);
  const isVisible = usePageVisibility();

  // Sync timer when visibility changes or game state updates
  useEffect(() => {
    console.warn("status", status);
    if (isVisible && status === "LIVE") {
      // Recalculate time remaining when returning to a live game
      let timeRemaining =
        (duration * 1000 + lastPayerTimestamp - Date.now()) / 1000;
      console.log("TIME REMAINING", timeRemaining);
      if (timeRemaining < 0) {
        timeRemaining = duration;
      }
      setInitialTimeRemaining(timeRemaining);
      setCountdownKey((prev) => prev + 1);
    } else if (status !== "LIVE") {
      // Reset timer for next game
      setInitialTimeRemaining(duration);
      setCountdownKey((prev) => prev + 1);
    }
  }, [isVisible, status, lastPayerTimestamp, setCountdownKey]);

  const renderTime = ({ remainingTime, color }: RenderTimeProps) => {
    if (remainingTime === 0) {
      return <p className={styles.timer}>Too late...</p>;
    }

    return (
      <div className={styles.timer}>
        <div className={styles.text}>Seconds</div>
        <div style={{ color }}>
          <div className={styles.value}>{remainingTime}</div>
        </div>
        <div className={styles.text}>Remaining</div>
      </div>
    );
  };

  return (
    <div className={styles.timerWrapper}>
      <CountdownCircleTimer
        isPlaying={isVisible && status === "LIVE"}
        key={countdownKey}
        duration={duration}
        initialRemainingTime={initialTimeRemaining}
        colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
        colorsTime={[
          duration,
          Math.floor(duration * 0.5),
          Math.floor(duration * 0.25),
          0,
        ]}
        // 100, 50, 25, 0
        onComplete={() => ({
          // shouldRepeat: true,
        })}
      >
        {renderTime}
      </CountdownCircleTimer>
      {displayingInvoice ? (
        <p className={styles.subtext}>
          Pay the invoice to {status === "LIVE" ? "reset" : "start"} the Timer.
        </p>
      ) : (
        <p className={styles.subtext}>Input your Lightning Address below.</p>
      )}
    </div>
  );
};

export default Countdown;
