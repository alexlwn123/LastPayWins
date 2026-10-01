import Link from "next/link";
import styles from "./Footer.module.css";
import Github from "./icons/Github";
import Telegram from "./icons/Telegram";

const Footer = () => (
  <div className={styles.footerContainer}>
    <footer className={styles.footer}>
      FOSS
      <Link
        href="https://github.com/alexlwn123/lastpaywins"
        target="_blank"
        rel="noreferrer"
      >
        <Github />
      </Link>
      <Link
        href="https://t.me/+ebguDutaWqE1ZmE5"
        target="_blank"
        rel="noreferrer"
      >
        <Telegram />
      </Link>
      <Link
        href="https://twitter.com/_alexlewin"
        target="_blank"
        rel="noreferrer"
      >
        @_alexlewin
      </Link>
      <Link href="https://twitter.com/chdwlch" target="_blank" rel="noreferrer">
        @chdwlch
      </Link>
    </footer>
    <p className={styles.fees}>
      Bids count when the server confirms payment. Late payments return the bid
      amount; payment fees are not refundable.
    </p>
    <p className={styles.bug}>
      If it bugs out and you don&apos;t get paid, DM{" "}
      <Link
        href="https://twitter.com/_alexlewin"
        target="_blank"
        rel="noreferrer"
      >
        @_alexlewin
      </Link>
    </p>
  </div>
);
export default Footer;
