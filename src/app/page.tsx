"use client";
import { useEffect, useRef, useState } from "react";
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
import usePusher from "@/hooks/usePusher";
import styles from "./page.module.css";
import "react-toastify/dist/ReactToastify.css";
import { Analytics } from "@vercel/analytics/react";
import { ToastContainer } from "react-toastify";
import { useInvoice } from "@/hooks/useInvoice";
import { useLnurl } from "@/hooks/useLnurl";
import { handleStatusUpdate } from "./utils";

export default function Home() {
  const [refetch, setRefetch] = useState(false);
  const [countdownKey, setCountdownKey] = useState<number>(0);
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
  });

  // handle status update
  useEffect(() => {
    console.log({ lnAddress, timestamp, jackpot, status });
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    handleStatusUpdate(status, lnAddress, userAddress, jackpot, timestamp);
    setCountdownKey((prevKey) => prevKey + 1);

    if (status === "LOADING") {
      setRefetch(true);
    }
  }, [status, jackpot, lnAddress, timestamp, userAddress]);

  return (
    <main className="page-main home">
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
