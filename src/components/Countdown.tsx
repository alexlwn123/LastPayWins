import { CountdownCircleTimer } from "react-countdown-circle-timer";
import styles from './Countdown.module.css';
import { Status } from "@/types/payer";

const Countdown = ({currentTime, countdownKey, status, setStatus, setMatchState, isWinning, toast, displayingInvoice}: {currentTime: number, countdownKey: number, status: Status, setStatus, setMatchState, isWinning: boolean, toast, displayingInvoice: boolean }) => {
  const duration = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60');
  const percentages = [1, .5, .25, 0];
  let colorsTime = percentages.map(p => Math.floor(p * duration));
  const renderTime = ({ remainingTime, color }) => {
    if (remainingTime === 0) {
      return <p className={styles.timer}>Too late...</p>;
    }

    return (
      <div className={styles.timer}>
        <div className={styles.text}>Seconds</div>
        <div style={{ color }}>
          <div className={styles.value}>
            {remainingTime}
          </div>
          </div>
        <div className={styles.text}>Remaining</div>
      </div>
    );
  };

  return (
    <div className={styles.timerWrapper}>
      <CountdownCircleTimer
        isPlaying={status === 'LIVE'}
        key={countdownKey}
        duration={duration}
        initialRemainingTime={status === 'LIVE' ? currentTime : duration}
        colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
        colorsTime={[duration, Math.floor(duration * 0.5), Math.floor(duration * 0.25), 0]}
        // 100, 50, 25, 0
        onComplete={() => {
          setStatus(isWinning ? 'WINNER' : 'EXPIRED', toast);
          setMatchState("WAITING")
          return {
            shouldRepeat: true
          }
        }}
      >
        {renderTime}
      </CountdownCircleTimer>
      {
        displayingInvoice ? 
          <p className={styles.subtext}>Pay the invoice to {status === 'LIVE' ? 'reset' : 'start'} the Timer.</p>
          : <p className={styles.subtext}>Input your Lightning Address below.</p>
      }
    </div>
  );
};

export default Countdown
