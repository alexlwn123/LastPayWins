import styles from './Jackpot.module.css';
import { fromSats } from 'satcomma';
const Jackpot = ({ jackpotSats = 0 }) => {
  return (
    <h1 className={styles.jackpot}>₿ {fromSats(jackpotSats)}</h1>
  )
};

export default Jackpot;