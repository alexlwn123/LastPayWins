import React from 'react';
import styles from './DCIHeader.module.css';

export const DCIHeader: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>DCI Betting Market</h1>
          <span className={styles.tagline}>Predict the future of drum corps</span>
        </div>
        
        <nav className={styles.nav}>
          <a href="#markets" className={styles.navLink}>Markets</a>
          <a href="#events" className={styles.navLink}>Events</a>
          <a href="#leaderboard" className={styles.navLink}>Leaderboard</a>
        </nav>
        
        <div className={styles.actions}>
          <div className={styles.balance}>
            <span className={styles.balanceLabel}>Balance</span>
            <span className={styles.balanceAmount}>$1,000</span>
          </div>
          <button type="button" className={styles.connectButton}>
            Connect Wallet
          </button>
        </div>
      </div>
    </header>
  );
};