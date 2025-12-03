import { fromSats } from "satcomma";
import styles from "./Jackpot.module.css";

type JackpotProps = {
  jackpotSats?: number;
};

const Jackpot = ({ jackpotSats = 0 }: JackpotProps) => {
  if (typeof jackpotSats !== "number" || Number.isNaN(jackpotSats))
    jackpotSats = 0;
  return (
    <div className={styles.jackpot}>
      <h1>₿ {fromSats(jackpotSats)}</h1>
    </div>
  );
};

export default Jackpot;
