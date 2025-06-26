import styles from "./Jackpot.module.css";
import { fromSats } from "satcomma";
const Jackpot = ({ jackpotSats = 0 }) => {
  if (typeof jackpotSats !== "number" || isNaN(jackpotSats)) jackpotSats = 0;
  return (
    <div className={styles.jackpot}>
      <h1>₿ {fromSats(jackpotSats)}</h1>
    </div>
  );
};

export default Jackpot;
