import styles from './input.module.css'
import { fromSats } from 'satcomma';
const CurrentWinner = ({currentWinner, isActive, jackpot}) => {
  return (
    <div className={styles.block}>
      <p><b>{isActive ? 'Current ' : 'Previous '} Winner: {currentWinner}</b></p>
      <p>₿ {fromSats(jackpot)}</p>
    </div>

  )
};
export { CurrentWinner };