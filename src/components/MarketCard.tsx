import React from 'react';
import { Market, DCIEvent } from '@/types/dci';
import { OutcomeCard } from './OutcomeCard';
import styles from './MarketCard.module.css';

interface MarketCardProps {
  market: Market;
  event: DCIEvent;
  onBet: (outcomeId: string, amount: number) => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({ market, event, onBet }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'finals':
        return '#ff4747';
      case 'championship':
        return '#ff8c00';
      case 'regional':
        return '#4caf50';
      default:
        return '#666';
    }
  };

  return (
    <div className={styles.marketCard}>
      <div className={styles.marketHeader}>
        <div className={styles.eventInfo}>
          <span 
            className={styles.eventType}
            style={{ backgroundColor: getEventTypeColor(event.type) }}
          >
            {event.type.toUpperCase()}
          </span>
          <span className={styles.eventDate}>
            {formatDate(event.date)}
          </span>
        </div>
        <div className={styles.eventLocation}>
          {event.location}
        </div>
      </div>
      
      <div className={styles.marketTitle}>
        <h3>{market.title}</h3>
        <p className={styles.marketDescription}>{market.description}</p>
      </div>

      <div className={styles.outcomes}>
        {market.outcomes.map((outcome) => (
          <OutcomeCard
            key={outcome.id}
            outcome={outcome}
            onBet={onBet}
          />
        ))}
      </div>

      <div className={styles.marketStats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Volume</span>
          <span className={styles.statValue}>
            ${market.outcomes.reduce((sum, o) => sum + o.totalVolume, 0).toLocaleString()}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Bets</span>
          <span className={styles.statValue}>
            {market.outcomes.reduce((sum, o) => sum + o.totalBets, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};