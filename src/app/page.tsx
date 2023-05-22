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

export default function Home() {
  const [invoice, setInvoice] = useState(null);
  const [hash, setHash] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [lastPayer, setLastPayer] = useState('');
  const weblnAvailable = useWebln()
  const [refetch, setRefetch] = useState(false)
  const [countdownKey, setCountdownKey] = useState<number>(0)
  const [fetching, setFetching] = useState(false);

  const { lnAddress, timestamp, jackpot, status, timeLeft } = usePusher();

  useEffect(() => {
    console.log('lnAddress', lnAddress, timestamp, jackpot, 'status-', status, 'timeleft-', timeLeft);
    if (status === 'LOADING') {
      setRefetch(true);
    }
  }, [status, jackpot])


  // get lnaddr from local storage
  useEffect(() => {
    const lnaddr = localStorage.getItem('lnaddr');
    if (lnaddr) {
      setUserAddress(userAddress);
    }
   }, []);


  // Get invoice
  useEffect(() => {
    if (fetching) return;
    setFetching(true);
    fetch('/api/invoice', { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        setInvoice(data.invoice)
        setHash(data.rHash)
        setSettled(false);
        setFetching(false);
      });
  }, [refetch]);

  // Check invoice
  useEffect(() => {
    console.log(settled, hash, status)
    if (settled || !hash || status === 'LOADING') return;
    const interval = setInterval(() => {
      const isNew = status !== 'LIVE'
      const url = `/api/invoice?hash=${encodeURIComponent(hash!)}&lnaddr=${userAddress}&isNew=${isNew}`
      fetch(url, { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          setSettled(data.settled && true);
          if (data.settled) {
            localStorage.setItem('lnaddr', userAddress);
            setCountdownKey(prevKey => prevKey + 1);
            setHash(null);
          }
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [hash, fetching])

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
        <h2>Pay the invoice to {status === 'WAITING' ? 'start' : 'reset'} the timer. </h2>
        <h2>
          If the timer hits zero before someone else pays, you win the jackpot.
        </h2>
      </div>
      <Jackpot jackpotSats={jackpot || 0} />
      {/* <button onClick={() => setCountdownKey(prevKey => prevKey + 1)}>Reset timer</button> */}
        <div className={styles.center}>
        {/* QR CODE */}
        <div className={styles.stack}>
          <Countdown currentTime={timeLeft} countdownKey={countdownKey} status={status} />

          { status !== 'LOADING' &&
            <CurrentWinner currentWinner={lnAddress ?? 'Anon'} isActive={status === 'LIVE'} jackpot={jackpot} />
          }
          <Input
            placeholder={"Lightning Address"}
            onChange={(e) => setUserAddress(e.target.value)}
            value={userAddress}
            />
        </div>
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
