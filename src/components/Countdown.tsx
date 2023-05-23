import { useEffect, useState } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import styles from '../app/page.module.css';
import { Status } from "@/types/payer";

const Countdown = ({currentTime, countdownKey, status, setStatus}: {currentTime: number, countdownKey: number, status: Status, setStatus }) => {
  const duration = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60');
  useEffect(() => {
    // console.log('currentTime', currentTime, typeof currentTime)
    // console.log('duration', duration)
  }, [currentTime]);

  const renderTime = ({ remainingTime, color }) => {
    if (remainingTime === 0) {
      return <p className={styles.timer}>Too late...</p>;
    }

    return (
      <div className={styles.timer}>
        <div className={styles.text}>seconds</div>
        <div style={{ color }}>
          <div className={styles.value}>
            {remainingTime}
          </div>
          </div>
        <div className={styles.text}>remaining</div>
      </div>
    );
  };

  return (
    <div className={styles.timerWrapper}>
      <CountdownCircleTimer
        isPlaying={status === 'LIVE'}
        key={countdownKey}
        duration={duration}
        initialRemainingTime={status !== 'WAITING' ? duration : currentTime}
        colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
        colorsTime={[60, 30, 15, 0]}
        onComplete={() => {
          setStatus('EXPIRED');
          return {
            shouldRepeat: true
          }
        }}
      >
        {renderTime}
      </CountdownCircleTimer>
      <p className={styles.subtext}>Pay the invoice to { status === 'WAITING' ? 'start': 'reset' } the Timer.</p>
    </div>
  );
};

export default Countdown
