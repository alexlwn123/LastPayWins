"use client";
// import "react-toastify/dist/ReactToastify.css";
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
import useConvexPresence from "@/hooks/useConvexPresence";
import { useInvoice } from "@/hooks/useInvoice";
import { useLnurl } from "@/hooks/useLnurl";
import type { Status } from "@/types/payer";
import styles from "./page.module.css";
import { handleStatusUpdate } from "./utils";

export default function Home() {
  const [refetch, setRefetch] = useState(false);
  const [countdownKey, setCountdownKey] = useState<number>(0);
  const [existingStatus, setExistingStatus] = useState<Status>("LOADING");
  // Track local status with the timestamp it was set for
  const [localStatusState, setLocalStatusState] = useState<{
    status: Status;
    forTimestamp: number;
  } | null>(null);
  const initialRender = useRef(true);

  const { userAddress, setUserAddress, isValidatingAddress, isValidAddress } =
    useLnurl();

  // Use Convex for game state and presence
  const {
    lnAddress,
    timestamp,
    jackpot,
    status: convexStatus,
    memberCount,
  } = useConvexGame();
  useConvexPresence();

  // Local status only applies if it was set for the current game (same timestamp)
  const localStatus =
    localStatusState?.forTimestamp === timestamp
      ? localStatusState.status
      : null;

  // Local status overrides Convex status for UI-specific states (WINNER, etc.)
  const status: Status = localStatus ?? convexStatus;

  // Allow setting local status (for WINNER detection in Countdown)
  const setStatus = (newStatus: Status) => {
    setLocalStatusState({ status: newStatus, forTimestamp: timestamp });
  };

  const { invoice } = useInvoice({
    userAddress: isValidAddress ? userAddress : null,
    status,
    setCountdownKey,
    refetch,
    setRefetch,
  });

  // handle status update
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    } else if (existingStatus === status) {
      return;
    }
    setTimeout(() => setExistingStatus(status), 0);
    handleStatusUpdate(status, lnAddress, userAddress, jackpot, timestamp);
    setTimeout(() => setCountdownKey((prevKey) => prevKey + 1), 0);
    if (status === "LOADING") {
      setTimeout(() => setRefetch(true), 0);
    }
  }, [status, jackpot, lnAddress, timestamp, userAddress, existingStatus]);

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
      <Loading isLoading={status === "LOADING" || !invoice}>
        <Jackpot jackpotSats={status === "LIVE" ? jackpot : 0} />
        <div className={styles.center}>
          <div className={styles.stack}>
            <Countdown
              lastPayerTimestamp={timestamp}
              countdownKey={countdownKey}
              setCountdownKey={setCountdownKey}
              status={status}
              setStatus={setStatus}
              isWinning={lnAddress === userAddress}
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
