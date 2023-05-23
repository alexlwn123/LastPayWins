'use client'
import styles from './page.module.css';
import { use, useEffect, useRef, useState } from 'react';
import Qr from '@/components/Qr';
import Countdown from '@/components/Countdown';
import Jackpot from '@/components/Jackpot';
import Input from '@/components/Input';
import useWebln from '@/components/useWeblnAvailable';
import usePusher from '@/hooks/usePusher';
import { CurrentWinner } from '@/components/CurrentWinner';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fromSats } from 'satcomma';
import { Triangle } from 'react-loader-spinner';

export default function Home() {
  const [invoice, setInvoice] = useState(null);
  const [hash, setHash] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  // const [lastPayer, setLastPayer] = useState('');
  const weblnAvailable = useWebln()
  const [refetch, setRefetch] = useState(false)
  const [countdownKey, setCountdownKey] = useState<number>(0)
  const [fetching, setFetching] = useState(false);
  const initialRender = useRef(true);

  const { lnAddress, timestamp, jackpot, status, timeLeft, setStatus } = usePusher();

  useEffect(() => {
    console.log('lnAddress', lnAddress, timestamp, jackpot, 'status-', status, 'timeleft-', timeLeft);
    if (initialRender.current) {
      initialRender.current = false;
      return;
    } else if (status === 'LIVE' && lnAddress !== userAddress) {
      toast(`Bid Received! - ${lnAddress}`, { type: 'info' });
    } else if (status === 'EXPIRED' && lnAddress !== userAddress) {
      toast(`Timer Expired! ${lnAddress} wins ₿ ${fromSats(jackpot)}!`, { type: 'info' });
    }
    setCountdownKey(prevKey => prevKey + 1);
    if (status === 'LOADING') {
      setRefetch(true);
    }
  }, [status, jackpot])


  // get lnaddr from local storage
  useEffect(() => {
    const lnaddr = localStorage.getItem('lnaddr');
    console.log('lnaddr', lnaddr);
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
    if (settled || !hash || status === 'LOADING') return;
    console.log(settled, hash, status)
    const interval = setInterval(() => {
      const isNew = status !== 'LIVE'
      const url = `/api/invoice?hash=${encodeURIComponent(hash!)}&lnaddr=${userAddress}&new=${isNew}`
      fetch(url, { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          setSettled(data.settled && true);
          if (data.settled) {
            localStorage.setItem('lnaddr', userAddress);
            setCountdownKey(prevKey => prevKey + 1);
            setHash(null);
            toast("Bid Received! You're in the lead!", { type: 'success' });
          }
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [hash, fetching, status, userAddress]);

  const handleWeblnPay = async (invoice: string) => {
    try {
      await window.webln.enable()
    } catch(e) {
      console.error('Failed to enable webln')
      return
    }

    try {
      await window.webln.sendPayment(invoice)
    } catch(e) {
      console.error('Failed to pay with webln', e)
    }
  }

  return (
    <main className={styles.main}>
      <ToastContainer
        hideProgressBar={true}
        autoClose={3000}
        pauseOnFocusLoss={false}
        theme="dark"
        closeButton={false}
      />
      <div className={styles.description}>
        <h1>Last Pay Wins</h1>
        <h2>
          Pay the invoice to {status === "LIVE" ? "reset" : "start"} the
          timer.{" "}
        </h2>
        <h2>
          If the timer hits zero before someone else pays, you win the jackpot.
        </h2>
      </div>
      {status !== "LOADING" ? ( <Jackpot jackpotSats={jackpot || 0} />) : (
        <Triangle
          height="80"
          width="80"
          color="#4fa94d"
          ariaLabel="triangle-loading"
          wrapperStyle={{}}
          visible={true}
        />
      )}
      <div className={styles.center}>
        {/* QR CODE */}
        <div className={styles.stack}>
          {status !== "LOADING" && (
            <>
              <Countdown
                currentTime={timeLeft}
                countdownKey={countdownKey}
                status={status}
                setStatus={setStatus}
              />
              <CurrentWinner
                currentWinner={lnAddress ?? "Anon"}
                isActive={status === "LIVE"}
                jackpot={jackpot}
                status={status}
              />

              <Input
                placeholder={"Lightning Address"}
                onChange={(e) => setUserAddress(e.target.value)}
                value={userAddress}
              />
            </>
          )}
        </div>
        {status !== "LOADING" && invoice && (
          <div className={styles.payment}>
            <Qr invoice={invoice} />
            <button
              className={styles.copy}
              onClick={() =>
                navigator?.clipboard?.writeText(invoice) ??
                console.error("Failed to copy")
              }
            >
              Copy Invoice
            </button>
            {weblnAvailable && (
              <button
                className={styles.copy}
                onClick={() => handleWeblnPay(invoice)}
              >
                Pay with WebLN
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
