import { AnimatePresence, motion } from "framer-motion";
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
    <div className={styles.container}>
      <div className={styles.label}>
        {isActive ? "Current Leader" : "Last Winner"}
      </div>
      <div className={styles.winnerBox}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentWinner}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={styles.winnerName}
          >
            {currentWinner}
          </motion.div>
        </AnimatePresence>
      </div>
      {!isActive && (
        <motion.p 
            className={styles.jackpot}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            Won ₿ {fromSats(jackpot)}
        </motion.p>
      )}
    </div>
  );
};

export default CurrentWinner;
