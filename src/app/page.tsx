"use client";
import { Analytics } from "@vercel/analytics/react";
import confetti from "canvas-confetti";
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
import { useInvoice } from "@/hooks/useInvoice";
import { useLnurl } from "@/hooks/useLnurl";
import usePusher from "@/hooks/usePusher";
import type { Status } from "@/types/payer";
import styles from "./page.module.css";
import { handleStatusUpdate } from "./utils";

export default function Home() {
  const [refetch, setRefetch] = useState(false);
  const [countdownKey, setCountdownKey] = useState<number>(0);
  const [existingStatus, setExistingStatus] = useState<Status>("LOADING");
  const initialRender = useRef(true);

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
    // Trigger confetti on win from invoice settling if handled there, 
    // but usually status update triggers it.
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

    // Confetti Effect
    if (status === "WINNER") {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#ffd700", "#ff2a2a", "#00f3ff"]
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#ffd700", "#ff2a2a", "#00f3ff"]
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
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
        toastStyle={{ 
            background: '#1a1a1a', 
            border: '1px solid #333', 
            color: '#fff',
            fontFamily: 'monospace' 
        }}
      />

      <div className={styles.cabinet}>
        <Header status={status} />
        
        <Loading isLoading={status === "LOADING" || !invoice}>
          <div className={styles.center}>
             <Jackpot jackpotSats={status === "LIVE" ? jackpot : 0} />
             
             <div className={styles.stack}>
                <Countdown
                  key={countdownKey}
                  lastPayerTimestamp={timestamp}
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
                
                {userAddress && isValidAddress && <Invoice invoice={invoice} />}
                
                <div className={styles.online}>
                  Players Online: <b>{memberCount}</b>
                </div>
             </div>
          </div>
        </Loading>
        
        <Footer />
      </div>

      <Analytics />
    </main>
  );
}
