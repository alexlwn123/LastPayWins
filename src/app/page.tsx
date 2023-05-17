'use client'
import styles from './page.module.css';
import { useEffect, useState } from 'react';
import Qr from '@/components/Qr';
import Countdown from '@/components/Countdown';
import Jackpot from '@/components/Jackpot';
import Input from '@/components/Input';
import Pusher from 'pusher-js';

export default function Home() {
  const [invoice, setInvoice] = useState(null);
  const [hash, setHash] = useState(null);
  const [settled, setSettled] = useState(false);
  const [lnAddress, setLnAddress] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [jackpot, setJackpot] = useState(0);
  const [lastPayer, setLastPayer] = useState('');

  // get lnaddr from local storage
  useEffect(() => {
    const lnaddr = localStorage.getItem('lnaddr');
    if (lnaddr) {
      setLnAddress(lnAddress);
    }
   }, []);
   // save lnaddr to local storage

  // Get initial state
  useEffect(() => { 
    fetch("/api/current-status", { method: "GET" })
      .then((response) => response.json())
      .then((data) => {
        console.log('current-status', data)
        setJackpot(data.jackpot);
        setLastPayer(data.lastPayer);
        const timestamp = data.timestamp;
        const timeLeft = 60 - Math.floor((Date.now() - timestamp) / 1000);
        setSeconds(timeLeft);
      });
  }, []);

  // Handle Timer
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY!;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!;
    // Pusher.logToConsole = true;
    console.log('keys', appKey, cluster);
    if (!appKey || !cluster) return;

    const pusher = new Pusher(appKey, {
      cluster: cluster,
    });

    const channel = pusher.subscribe("timer");
    const lastPayer = pusher.subscribe("last-payer");

    channel.bind("reset", () => {
      setSeconds(60);
    });

    lastPayer.bind("update", (data) => {
      setJackpot(data.jackpot);
      setLastPayer(data.lastPayer);
      const timeLeft = 60 - Math.floor((Date.now() - data.timestamp) / 1000);
      console.log('time left', timeLeft);
      setSeconds(timeLeft);
    });

    // const interval = setInterval(() => {
    //   setSeconds((seconds) => (seconds === 0 ? 60 : seconds - 1));
    // }, 1000);

    return () => {
      // clearInterval(interval);
      channel.unbind_all();
      lastPayer.unbind_all();
      channel.unsubscribe();
      lastPayer.unsubscribe();
    };
  }, []);

  // Get invoice
  useEffect(() => {
    fetch('/api/invoice', { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        setInvoice(data.invoice)
        setHash(data.rHash)
      });
  }, []);

  // Check invoice
  useEffect(() => {
    if (settled) return;
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

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>Last Pay Wins</h1>
        <h2>Pay the invoice to reset the timer. </h2>
        <h2>
          If the timer hits zero before someone else pays, you win the jackpot.
        </h2>
      </div>
      <Jackpot jackpotSats={jackpot} />
      <div className={styles.center}>
        {/* QR CODE */}
        <Countdown currentTime={seconds} />
        {/* <Timer /> */}
        <Input
          placeholder={"Lightning Address"}
          onChange={(e) => setLnAddress(e.target.value)}
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
          </div>
        )}
      </div>
    </main>
  );
}
