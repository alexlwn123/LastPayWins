"use client";

import { motion } from "framer-motion";
import { fromSats } from "satcomma";
import styles from "./Jackpot.module.css";

type JackpotProps = {
  jackpotSats?: number;
};

const AnimatedDigit = ({ digit }: { digit: string }) => {
  const num = parseInt(digit);
  if (Number.isNaN(num)) return <span className={styles.comma}>{digit}</span>;

  return (
    <div className={styles.digitWrapper}>
      <motion.div
        animate={{ y: `${-num}em` }}
        transition={{ 
          type: "spring", 
          stiffness: 60, 
          damping: 15,
          mass: 1
        }}
        className={styles.digitColumn}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} style={{ height: "1em", width: "100%", textAlign: "center" }}>
            {i}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const Jackpot = ({ jackpotSats = 0 }: JackpotProps) => {
  const safeSats = (typeof jackpotSats !== "number" || Number.isNaN(jackpotSats)) ? 0 : jackpotSats;
  
  // Format with commas using satcomma logic or similar
  const formatted = fromSats(safeSats); 
  // "100,000" -> ["1", "0", "0", ",", "0", "0", "0"]
  const chars = formatted.split("");

  return (
    <div className={styles.container}>
      <div className={styles.label}>Current Jackpot</div>
      <div className={styles.display}>
        <span className={styles.symbol}>₿</span>
        {chars.map((char, i) => (
          // Use index as key for position stability, but we might have length changes.
          // Ideally we key by place value (ones, tens, hundreds) but that's complex with commas.
          // Simple index key works if we assume it grows to the left but here it grows to right in DOM?
          // Actually if it goes 9 -> 10, we add a digit.
          // Let's use index for now.
          <AnimatedDigit key={i} digit={char} />
        ))}
      </div>
    </div>
  );
};

export default Jackpot;
