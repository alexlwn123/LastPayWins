import React, { useState } from 'react';
import { Outcome } from '@/types/dci';
import styles from './OutcomeCard.module.css';

interface OutcomeCardProps {
  outcome: Outcome;
  onBet: (outcomeId: string, amount: number) => void;
}

export const OutcomeCard: React.FC<OutcomeCardProps> = ({ outcome, onBet }) => {
  const [betAmount, setBetAmount] = useState<string>('');
  const [showBetForm, setShowBetForm] = useState(false);

  const handleBet = () => {
    const amount = parseFloat(betAmount);
    if (amount > 0) {
      onBet(outcome.id, amount);
      setBetAmount('');
      setShowBetForm(false);
    }
  };

  const calculateProbability = (odds: number) => {
    return Math.round((1 / odds) * 100);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume}`;
  };

  return (
    <div className={styles.outcomeCard}>
      <div className={styles.outcomeHeader}>
        <div className={styles.outcomeTitle}>
          {outcome.title}
        </div>
        <div className={styles.probability}>
          {calculateProbability(outcome.odds)}%
        </div>
      </div>

      <div className={styles.odds}>
        <span className={styles.oddsLabel}>Odds</span>
        <span className={styles.oddsValue}>{outcome.odds.toFixed(2)}</span>
      </div>

      <div className={styles.outcomeStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Volume</span>
          <span className={styles.statValue}>{formatVolume(outcome.totalVolume)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Bets</span>
          <span className={styles.statValue}>{outcome.totalBets}</span>
        </div>
      </div>

      <div className={styles.betSection}>
        {!showBetForm ? (
          <button 
            type="button"
            className={styles.betButton}
            onClick={() => setShowBetForm(true)}
          >
            Place Bet
          </button>
        ) : (
          <div className={styles.betForm}>
            <input
              type="number"
              placeholder="Amount ($)"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className={styles.betInput}
              min="1"
              step="1"
            />
            <div className={styles.betActions}>
              <button 
                type="button"
                className={styles.confirmBet}
                onClick={handleBet}
                disabled={!betAmount || parseFloat(betAmount) <= 0}
              >
                Bet ${betAmount || '0'}
              </button>
              <button 
                type="button"
                className={styles.cancelBet}
                onClick={() => {
                  setShowBetForm(false);
                  setBetAmount('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};