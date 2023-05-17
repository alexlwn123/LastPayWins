import { useEffect, useState } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import styles from '../app/page.module.css';

const Countdown = ({currentTime, countdownKey}: {currentTime: number, countdownKey: number}) => {
  const duration = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60');
  useEffect(() => {

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
        isPlaying
        key={countdownKey}
        duration={duration}
        initialRemainingTime={currentTime}
        colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
        colorsTime={[60, 30, 15, 0]}
      >
        {renderTime}
      </CountdownCircleTimer>
      <p className={styles.subtext}>Pay the invoice to reset the Timer.</p>
    </div>
  );
};

export default Countdown
