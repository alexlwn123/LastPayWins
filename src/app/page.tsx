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
      setUserAddress(userAddress);
    }
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
  }, [paid]);

  // Check invoice
  useEffect(() => {
    if (settled) {
      setPaid(true);
      return;
    }
    const interval = setInterval(() => {
      console.log(hash, userAddress)
      fetch(`/api/invoice?hash=${hash}&lnaddr=${userAddress}`, { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          setSettled(data.settled);
          if (data.settled) {
            localStorage.setItem('lnaddr', userAddress);
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
      <Jackpot jackpotSats={jackpot || 0} />
      <div className={styles.center}>
        {/* QR CODE */}
        <Countdown currentTime={seconds} countdownKey={countdownKey} />
        {/* <Timer /> */}
        <Input
          placeholder={"Lightning Address"}
          onChange={(e) => setUserAddress(e.target.value)}
          value={userAddress}
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
