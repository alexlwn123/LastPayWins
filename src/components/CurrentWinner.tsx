import { fromSats } from "satcomma";
import styles from "./CurrentWinner.module.css";

type CurrentWinnerProps = {
  currentWinner: string;
  isActive: boolean;
  jackpot: number;
};

const CurrentWinner = ({ currentWinner, isActive, jackpot }: CurrentWinnerProps) => {
  return (
    <div className={styles.block}>
      <div>
        <div className={styles.line}>
          <p>{isActive ? "Current " : "Previous "} Winner:</p>
        </div>
        <p className={styles.winner}>
          <b className={styles.line}>{currentWinner}</b>
        </p>
      </div>
      {!isActive && <p>₿ {fromSats(jackpot)}</p>}
    </div>
  );
};
export default CurrentWinner;
