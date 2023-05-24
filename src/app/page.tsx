'use client'
import styles from './page.module.css';
import { useEffect, useRef, useState } from "react";
import {
  Header,
  CurrentWinner,
  Footer,
  Countdown,
  Jackpot,
  Invoice,
  Loading,
  Input,
} from "@/components";
import usePusher from '@/hooks/usePusher';
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { fromSats } from 'satcomma';
import va from "@vercel/analytics";
import { Analytics } from '@vercel/analytics/react';

export default function Home() {
  const [invoice, setInvoice] = useState(null);
  const [hash, setHash] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [refetch, setRefetch] = useState(false)
  const [countdownKey, setCountdownKey] = useState<number>(0)
  const [fetching, setFetching] = useState(false);
  const [checking, setChecking] = useState(false);
  const initialRender = useRef(true);

  const { lnAddress, timestamp, jackpot, status, timeLeft, setStatus } = usePusher();

  useEffect(() => {
    console.log('lnAddress', lnAddress, 'timestamp', timestamp, 'jackpot', jackpot, 'status', status, 'timeleft', timeLeft);
    if (initialRender.current) {
      initialRender.current = false;
      return;
    } else if (status === 'LIVE' && lnAddress !== userAddress) {
      va.track('Bid', { user: lnAddress, jackpot, timestamp });
      toast(`Bid Received! - ${lnAddress}`, { type: 'info' });
    } else if (status === 'EXPIRED' && lnAddress !== userAddress) {
      toast(`Timer Expired! ${lnAddress} wins ₿ ${fromSats(jackpot)}!`, { type: 'info', pauseOnFocusLoss: true });
    } else if (status === 'WINNER') {
      va.track('Winner', { user: lnAddress, jackpot, timestamp });
      toast(`CONGRATULATIONS! You've won ₿ ${fromSats(jackpot)}!`, { type: 'success', pauseOnFocusLoss: true });
    } else if (status === 'PAYMENT_SUCCESS') {
      va.track('Winner Payment Success', { user: lnAddress, jackpot, timestamp });
      toast(`Payment Settled! Enjoy your Sats!`, { type: 'success', pauseOnFocusLoss: true });
    } else if (status === 'PAYMENT_FAILED') {
      va.track('Winner Payment Failed', { user: lnAddress, jackpot, timestamp });
      toast(`Payment Failed - DM @_alexlewin on Twitter to get paid.`, { type: 'error', pauseOnFocusLoss: true });
    }
    setCountdownKey(prevKey => prevKey + 1);

    if (status === 'LOADING') {
      setRefetch(true);
    }
  }, [status, jackpot])


  // get lnaddr from local storage
  useEffect(() => {
    const lnaddr = localStorage.getItem('lnaddr');
    if (lnaddr) {
      setUserAddress(lnaddr);
    }
   }, []);


  // Get invoice
  useEffect(() => {
    if (fetching || hash) return;
    setFetching(true);
    fetch('/api/invoice', { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        setInvoice(data.invoice)
        setHash(data.rHash)
        setSettled(false);
        setFetching(false);
      });
  }, [refetch, hash]);

  // Check invoice
  useEffect(() => {
    if (settled || !hash || status === 'LOADING' || checking) return;
    const interval = setInterval(() => {
      if (checking) return;
      setChecking(true);
      const url = `/api/invoice?hash=${encodeURIComponent(hash!)}&lnaddr=${userAddress}`
      fetch(url, { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          if (data.settled) {
            setSettled(data.settled && true);
            localStorage.setItem('lnaddr', userAddress);
            setCountdownKey(prevKey => prevKey + 1);
            setHash(null);
            toast("Bid Received! You're in the lead!", { type: 'success' });
          }
          setChecking(false);
        }).catch(_ => setChecking(false));
    }, 1000);
    return () => clearInterval(interval);
  }, [hash, fetching, status, userAddress, settled, checking]);

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
        <Jackpot jackpotSats={status === 'LIVE' ? jackpot : 0} />
        <div className={styles.center}>
          <div className={styles.stack}>
            <Countdown
              currentTime={timeLeft}
              countdownKey={countdownKey}
              status={status}
              setStatus={setStatus}
              isWinning={lnAddress === userAddress}
              toast={toast}
            />
            <CurrentWinner
              currentWinner={lnAddress ?? "Anon"}
              isActive={status === "LIVE"}
              jackpot={jackpot}
              status={status}
            />
            <Input
              placeholder={"example@lightningaddress.com"}
              onChange={(e) => setUserAddress(e.target.value)}
              value={userAddress}
            />
          </div>
          <Invoice invoice={invoice} toast={toast} />
        </div>
      </Loading>
      <Footer />
      <Analytics />
    </main>
  );
}
