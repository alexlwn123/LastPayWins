"use client";

import { Analytics } from "@vercel/analytics/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import {
  CurrentWinner,
  DramaticCountdown,
  EmotionalOverlay,
  Input,
  InvoicePanel,
  InvoiceToggle,
  Loading,
  SlotJackpot,
  SoundToggle,
  type EmotionalState,
} from "@/components";
import { useInvoice } from "@/hooks/useInvoice";
import { useLnurl } from "@/hooks/useLnurl";
import usePusher from "@/hooks/usePusher";
import useSoundEffects from "@/hooks/useSoundEffects";
import type { Status } from "@/types/payer";
import styles from "./page.module.css";

export default function Home() {
  const [refetch, setRefetch] = useState(false);
  const [countdownKey, setCountdownKey] = useState<number>(0);
  const [existingStatus, setExistingStatus] = useState<Status>("LOADING");
  const [invoicePanelOpen, setInvoicePanelOpen] = useState(false);
  const [emotionalState, setEmotionalState] = useState<EmotionalState>("idle");
  const [isUrgent, setIsUrgent] = useState(false);
  const initialRender = useRef(true);
  const prevLnAddress = useRef<string>("");

  const { userAddress, setUserAddress, isValidatingAddress, isValidAddress } =
    useLnurl();

  const { lnAddress, timestamp, jackpot, status, setStatus, memberCount } =
    usePusher();

  const { invoice } = useInvoice({
    userAddress: isValidAddress ? userAddress : null,
    status,
    setCountdownKey,
    refetch,
    setRefetch,
  });

  const { isMuted, toggleMute, playSound } = useSoundEffects();

  // Handle emotional state and status updates
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      prevLnAddress.current = lnAddress;
      return;
    }

    if (existingStatus === status && prevLnAddress.current === lnAddress) {
      return;
    }

    // Check if user was outbid
    const wasOutbid =
      status === "LIVE" &&
      lnAddress !== userAddress &&
      prevLnAddress.current !== lnAddress &&
      prevLnAddress.current === userAddress;

    // Check if user's bid was received
    const bidReceived =
      status === "LIVE" &&
      lnAddress === userAddress &&
      prevLnAddress.current !== lnAddress;

    setTimeout(() => setExistingStatus(status), 0);
    setTimeout(() => setCountdownKey((prevKey) => prevKey + 1), 0);

    if (status === "WINNER") {
      setEmotionalState("winner");
      playSound("win");
    } else if (wasOutbid) {
      setEmotionalState("outbid");
      playSound("outbid");
    } else if (bidReceived) {
      setEmotionalState("bid_received");
      playSound("bid");
      setInvoicePanelOpen(false);
    } else if (status === "EXPIRED" && lnAddress !== userAddress) {
      setEmotionalState("expired");
    } else if (status === "LOADING") {
      setTimeout(() => setRefetch(true), 0);
    }

    prevLnAddress.current = lnAddress;
  }, [status, lnAddress, userAddress, existingStatus, playSound]);

  // Handle urgency state
  const handleUrgent = useCallback(
    (urgent: boolean) => {
      setIsUrgent(urgent);
      if (urgent && emotionalState === "idle") {
        setEmotionalState("urgent");
      } else if (!urgent && emotionalState === "urgent") {
        setEmotionalState("idle");
      }
    },
    [emotionalState],
  );

  // Handle countdown tick for sounds
  const handleTick = useCallback(
    (remaining: number) => {
      if (remaining <= 5 && remaining > 0) {
        playSound("tick");
      }
    },
    [playSound],
  );

  // Reset emotional state
  const handleEmotionalComplete = useCallback(() => {
    setEmotionalState("idle");
  }, []);

  const handleToggleInvoicePanel = useCallback(() => {
    setInvoicePanelOpen((prev) => !prev);
  }, []);

  const handleCloseInvoicePanel = useCallback(() => {
    setInvoicePanelOpen(false);
  }, []);

  return (
    <main className={`${styles.main} ${isUrgent ? styles.urgent : ""}`}>
      <ToastContainer
        hideProgressBar={true}
        autoClose={3000}
        pauseOnFocusLoss={false}
        theme="dark"
        closeButton={false}
        position="top-center"
      />

      {/* Sound Toggle */}
      <SoundToggle isMuted={isMuted} onToggle={toggleMute} />

      {/* Background effects */}
      <div className={styles.backgroundGlow} />
      <div className={styles.gridPattern} />

      {/* Emotional Overlay */}
      <EmotionalOverlay
        state={emotionalState}
        jackpot={jackpot}
        onComplete={handleEmotionalComplete}
      />

      {/* Main content */}
      <Loading isLoading={status === "LOADING" || !invoice}>
        <div className={styles.container}>
          {/* Branding */}
          <header className={styles.header}>
            <h1 className={styles.title}>LAST PAY WINS</h1>
            <p className={styles.tagline}>
              Pay to reset the timer. If it hits zero, you win the jackpot.
            </p>
          </header>

          {/* Hero section - Jackpot & Countdown */}
          <section className={styles.hero}>
            <SlotJackpot
              jackpotSats={status === "LIVE" ? jackpot : 0}
              isActive={status === "LIVE"}
            />

            <DramaticCountdown
              lastPayerTimestamp={timestamp}
              countdownKey={countdownKey}
              setCountdownKey={setCountdownKey}
              status={status}
              setStatus={setStatus}
              isWinning={lnAddress === userAddress}
              displayingInvoice={isValidAddress}
              onUrgent={handleUrgent}
              onTick={handleTick}
            />
          </section>

          {/* Current winner */}
          <CurrentWinner
            currentWinner={lnAddress ?? "Anon"}
            isActive={status === "LIVE"}
            jackpot={jackpot}
          />

          {/* Input section */}
          <section className={styles.inputSection}>
            <Input
              placeholder="your@lightning.address"
              onChange={(e) => setUserAddress(e.target.value)}
              value={userAddress}
              isValidAddress={isValidAddress}
              isValidating={isValidatingAddress}
            />
            <div className={styles.playersOnline}>
              <span className={styles.onlineDot} />
              <span>{memberCount} players online</span>
            </div>
          </section>

          {/* Footer */}
          <footer className={styles.footer}>
            <div className={styles.footerLinks}>
              <Link
                href="https://github.com/alexlwn123/lastpaywins"
                target="_blank"
                rel="noreferrer"
                className={styles.footerLink}
              >
                GitHub
              </Link>
              <span className={styles.footerDivider}>•</span>
              <Link
                href="https://t.me/+ebguDutaWqE1ZmE5"
                target="_blank"
                rel="noreferrer"
                className={styles.footerLink}
              >
                Telegram
              </Link>
              <span className={styles.footerDivider}>•</span>
              <Link
                href="https://twitter.com/_alexlewin"
                target="_blank"
                rel="noreferrer"
                className={styles.footerLink}
              >
                @_alexlewin
              </Link>
            </div>
            <p className={styles.footerNote}>10% fee after 20,000 sats</p>
          </footer>
        </div>
      </Loading>

      {/* Invoice toggle button */}
      <InvoiceToggle
        isOpen={invoicePanelOpen}
        onToggle={handleToggleInvoicePanel}
        hasInvoice={!!invoice && isValidAddress}
      />

      {/* Invoice slide panel */}
      <InvoicePanel
        invoice={invoice}
        isOpen={invoicePanelOpen}
        onClose={handleCloseInvoicePanel}
      />

      <Analytics />
    </main>
  );
}
