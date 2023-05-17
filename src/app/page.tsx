'use client'
import styles from './page.module.css';
import { use, useEffect, useState } from 'react';
import Qr from '@/components/Qr';
import Countdown from '@/components/Countdown';
import Jackpot from '@/components/Jackpot';
import Input from '@/components/Input';
import useWebln from '@/components/useWeblnAvailable';
import usePusher from '@/hooks/usePusher';

export default function Home() {
  const [invoice, setInvoice] = useState(null);
  const [hash, setHash] = useState(null);
  const [settled, setSettled] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [lastPayer, setLastPayer] = useState('');
  const weblnAvailable = useWebln()
  const [paid, setPaid] = useState(false);
  const [countdownKey, setCountdownKey] = useState<number>(0)

  const { lnAddress, timestamp, jackpot } = usePusher();

  // useEffect(() => {
  //   console.log('CHANGE', lastPayer);
  // }, [lastPayer]);


  // get lnaddr from local storage
  useEffect(() => {
    const lnaddr = localStorage.getItem('lnaddr');
    if (lnaddr) {
      setUserAddress(lnAddress);
    }
   }, []);
   // save lnaddr to local storage

  // Get initial state
  // useEffect(() => { 
  //   fetch("/api/current-status", { method: "GET" })
  //     .then((response) => response.json())
  //     .then((data) => {
  //       console.log('current-status', data)
  //       setJackpot(data.jackpot);
  //       setLastPayer(data.lastPayer);
  //       const timestamp = data.timestamp;
  //       const timeLeft = 60 - Math.floor((Date.now() - timestamp) / 1000);
  //       setSeconds(timeLeft);
  //     });
  // }, []);

  // Handle Timer
  // useEffect(() => {
  //   const appKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY!;
  //   const cluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!;
  //   // Pusher.logToConsole = true;
  //   console.log('keys', appKey, cluster);
  //   if (!appKey || !cluster) return;

  //   const pusher = new Pusher(appKey, {
  //     cluster: cluster,
  //   });

  //   const channel = pusher.subscribe("timer");
  //   const lastPayer = pusher.subscribe("cache-last-payer");
  //   console.log('LAST PAYER', lastPayer);

  //   channel.bind("reset", () => {
  //     setSeconds(60);
  //   });

    // lastPayer.bind("update", (data) => {
    //   console.log('LAST PAYER update', lastPayer);
      // setJackpot(data.jackpot);
      // setLastPayer(data.lastPayer);
    //   const timeLeft = 60 - Math.floor((Date.now() - data.timestamp) / 1000);
    //   console.log('time left', timeLeft);
    //   setSeconds(timeLeft);
    // });

  //   return () => {
  //     // clearInterval(interval);
  //     channel.unbind_all();
  //     lastPayer.unbind_all();
  //     channel.unsubscribe();
  //     lastPayer.unsubscribe();
  //   };
  // }, []);

  // Get invoice
  useEffect(() => {
    fetch('/api/invoice', { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        setInvoice(data.invoice)
        setHash(data.rHash)
      });
  }, [paid]);

  // Check invoice
  useEffect(() => {
    if (settled) {
      setPaid(true);
      return;
    }
    const interval = setInterval(() => { 
      console.log(hash, lnAddress)
      fetch(`/api/invoice?hash=${hash}&lnaddr=${lnAddress}`, { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          setSettled(data.settled);
          if (data.settled) {
            localStorage.setItem('lnaddr', lnAddress);
          }
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [hash, settled])

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
      <div className={styles.description}>
        <h1>Last Pay Wins</h1>
        <h2>Pay the invoice to reset the timer. </h2>
        <h2>
          If the timer hits zero before someone else pays, you win the jackpot.
        </h2>
      </div>
      {/* <button onClick={() => setCountdownKey(prevKey => prevKey + 1)}>Reset timer</button> */}
      {jackpot && <Jackpot jackpotSats={jackpot || 0} />} 
      <div className={styles.center}>
        {/* QR CODE */}
        <Countdown currentTime={seconds} countdownKey={countdownKey} />
        {/* <Timer /> */}
        <Input
          placeholder={"Lightning Address"}
          onChange={(e) => setUserAddress(e.target.value)}
          value={lnAddress}
        />
        {invoice && (
          <div className={styles.payment}>
            <Qr invoice={invoice} />
            {settled && <h1>PAID</h1>}
            <button
              className={styles.copy}
              onClick={() =>
                navigator?.clipboard?.writeText(invoice) ?? console.error('Failed to copy')
              }
            >
              Copy Invoice
            </button>
            { weblnAvailable &&
              <button
                className={styles.copy}
                onClick={() => handleWeblnPay(invoice)}
              >
                Pay with WebLN
              </button>
            }
          </div>
        )}
      </div>
    </main>
  );
}
