import { fromSats } from "satcomma";
import styles from "./CurrentWinner.module.css";

type CurrentWinnerProps = {
  currentWinner: string;
  isActive: boolean;
  jackpot: number;
};

const CurrentWinner = ({
  currentWinner,
  isActive,
  jackpot,
}: CurrentWinnerProps) => {
  return (
    <div className={`${styles.block} ${isActive ? styles.active : ""}`}>
      <span className={styles.label}>
        {isActive ? "CURRENT LEADER" : "PREVIOUS WINNER"}
      </span>
      <p className={styles.winner} title={currentWinner}>
        {currentWinner}
      </p>
      {!isActive && jackpot > 0 && (
        <span className={styles.previousWinnings}>
          Won ₿ {fromSats(jackpot)}
        </span>
      )}
    </div>
  );
};

export default CurrentWinner;
