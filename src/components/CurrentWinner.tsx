import { fromSats } from "satcomma";
import styles from "./CurrentWinner.module.css";

const CurrentWinner = ({ currentWinner, isActive, jackpot }) => {
  return (
    <div className={styles.block}>
      <div>
        <div className={styles.line}>
          {/* {isActive ? "Current " : "Previous "} Winner: <span className={styles.winner}>{currentWinner}</span> */}
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
