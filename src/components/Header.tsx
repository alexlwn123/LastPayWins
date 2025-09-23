import Link from "next/link";
import styles from "./Header.module.css";

const Header = ({ status }) => (
  <header className={styles.description}>
    <div className={styles.nav}>
      <Link href="/leaderboard" className={styles.leaderboardLink}>
        🏆 Leaderboard
      </Link>
    </div>
    <h1>Last Pay Wins</h1>
    <h2>
      Pay the invoice to {status === "LIVE" ? "reset" : "start"} the timer.{" "}
    </h2>
    <h2>
      If the timer hits zero before someone else pays, you win the jackpot.
    </h2>
  </header>
);
export default Header;
