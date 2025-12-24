import type { GameStatus } from "@/types/payer";
import styles from "./Header.module.css";

type HeaderProps = {
  status: GameStatus;
};

const Header = ({ status }: HeaderProps) => (
  <header className={styles.description}>
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
