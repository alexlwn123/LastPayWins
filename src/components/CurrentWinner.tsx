import styles from "./CurrentWinner.module.css";
import { fromSats } from "satcomma";
const CurrentWinner = ({ currentWinner, isActive, jackpot, status }) => {
	return (
		<div className={styles.block}>
			<p>
				<div className={styles.line}>
					{/* {isActive ? "Current " : "Previous "} Winner: <span className={styles.winner}>{currentWinner}</span> */}
					{isActive ? "Current " : "Previous "} Winner:
				</div>
				<b className={styles.line}>
					<span className={styles.winner}>{currentWinner}</span>
				</b>
			</p>
			{!isActive && <p>₿ {fromSats(jackpot)}</p>}
		</div>
	);
};
export default CurrentWinner;
