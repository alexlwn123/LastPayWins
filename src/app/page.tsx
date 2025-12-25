"use client";

import { Analytics } from "@vercel/analytics/react";
import { useEffect, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import {
  Countdown,
  CurrentWinner,
  Footer,
  Header,
  Input,
  Invoice,
  Jackpot,
  Loading,
} from "@/components";
import useConvexGame from "@/hooks/useConvexGame";
import { useConvexInvoice } from "@/hooks/useConvexInvoice";
import useConvexPresence from "@/hooks/useConvexPresence";
import { useLnurl } from "@/hooks/useLnurl";
import type { GameStatus } from "@/types/payer";
import styles from "./page.module.css";
import { handleStatusUpdate } from "./utils";

export default function Home() {
  const [countdownKey, setCountdownKey] = useState<number>(0);
  const [existingStatus, setExistingStatus] = useState<GameStatus>("LOADING");
  const initialRender = useRef(true);
  const prevGameRef = useRef<{ jackpot: number; lnAddress: string } | null>(
    null,
  );

  const { userAddress, setUserAddress, isValidatingAddress, isValidAddress } =
    useLnurl();

  const { lnAddress, timestamp, jackpot, status, memberCount } =
    useConvexGame();

  // Pass lnAddress to presence - this triggers invoice creation on heartbeat
  useConvexPresence({
    lnAddress: isValidAddress ? userAddress : null,
  });

  const { invoice } = useConvexInvoice({ isValidAddress });

  const isWinner = Boolean(userAddress && lnAddress === userAddress);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      prevGameRef.current = { jackpot, lnAddress };
      return;
    }
    if (existingStatus === status) {
      prevGameRef.current = { jackpot, lnAddress };
      return;
    }

    const gameEnded = existingStatus === "LIVE" && status === "WAITING";
    const prevGame = prevGameRef.current;

    setTimeout(() => setExistingStatus(status), 0);
    handleStatusUpdate(
      status,
      lnAddress,
      userAddress,
      gameEnded && prevGame ? prevGame.jackpot : jackpot,
      timestamp,
      gameEnded && prevGame
        ? Boolean(userAddress && prevGame.lnAddress === userAddress)
        : isWinner,
      gameEnded,
    );
    setTimeout(() => setCountdownKey((prevKey) => prevKey + 1), 0);

    prevGameRef.current = { jackpot, lnAddress };
  }, [
    status,
    jackpot,
    lnAddress,
    timestamp,
    userAddress,
    existingStatus,
    isWinner,
  ]);

  return (
    <main className={styles.main}>
      <ToastContainer
        hideProgressBar={true}
        autoClose={3000}
        pauseOnFocusLoss={false}
        theme="dark"
        closeButton={false}
      />

      <Header status={status} />
      <Loading isLoading={status === "LOADING"}>
        <Jackpot jackpotSats={status === "LIVE" ? jackpot : 0} />
        <div className={styles.center}>
          <div className={styles.stack}>
            <Countdown
              lastPayerTimestamp={timestamp}
              countdownKey={countdownKey}
              setCountdownKey={setCountdownKey}
              status={status}
              displayingInvoice={isValidAddress}
            />
            <CurrentWinner
              currentWinner={lnAddress ?? "Anon"}
              isActive={status === "LIVE"}
              jackpot={jackpot}
            />
            <Input
              placeholder={"example@lightningaddress.com"}
              onChange={(e) => setUserAddress(e.target.value)}
              value={userAddress}
              isValidAddress={isValidAddress}
              isValidating={isValidatingAddress}
            />
            <div className={styles.online}>
              Players Online: <b>{memberCount}</b>
            </div>
          </div>
          {userAddress && isValidAddress && <Invoice invoice={invoice} />}
        </div>
      </Loading>
      <Footer />
      <Analytics />
    </main>
  );
}
