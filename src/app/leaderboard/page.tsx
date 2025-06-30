"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import styles from "./page.module.css";
import type { Winner } from "@/pages/api/leaderboard";

export default function Leaderboard() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }
        const data = await response.json();
        setWinners(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  const formatSats = (sats: number) => {
    return sats.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const maskAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <main className="page-main">
        <div className="page-container">
          <div className={styles.leaderboardContainer}>
            <h1 className={styles.title}>Leaderboard</h1>
            <div className={styles.loading}>Loading...</div>
          </div>
        </div>
        <Analytics />
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-main">
        <div className="page-container">
          <div className={styles.leaderboardContainer}>
            <h1 className={styles.title}>Leaderboard</h1>
            <div className={styles.error}>Error: {error}</div>
            <Link href="/" className={styles.backLink}>
              ← Back to Game
            </Link>
          </div>
        </div>
        <Analytics />
      </main>
    );
  }

  return (
    <main className="page-main">
      <div className="page-container">
        <div className={styles.leaderboardContainer}>
          <h1 className={styles.title}>🏆 Past Winners</h1>
          
          <Link href="/" className={styles.backLink}>
            ← Back to Game
          </Link>

          {winners.length === 0 ? (
            <div className={styles.noWinners}>
              No winners yet. Be the first to win!
            </div>
          ) : (
            <div className={styles.leaderboard}>
              {winners.map((winner, index) => (
                <div key={winner.timestamp} className={styles.winnerCard}>
                  <div className={styles.rank}>#{index + 1}</div>
                  <div className={styles.winnerInfo}>
                    <div className={styles.address}>
                      {maskAddress(winner.lnAddress)}
                    </div>
                    <div className={styles.date}>
                      {formatDate(winner.date)}
                    </div>
                  </div>
                  <div className={styles.jackpot}>
                    ₿ {formatSats(winner.jackpot)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Analytics />
    </main>
  );
}