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
import va from "@vercel/analytics";
import { Analytics } from '@vercel/analytics/react';
import { generatePrivateKey } from 'nostr-tools'
import { checkInvoiceStatus, handleStatusUpdate, validateLnurl, getZapInvoice } from './utils';

export default function Home() {
  const [invoice, setInvoice] = useState<string | null | undefined>(null);
  const [hash, setHash] = useState<string | null | undefined>(null);
  const [settled, setSettled] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [refetch, setRefetch] = useState(false)
  const [countdownKey, setCountdownKey] = useState<number>(0)
  const [fetching, setFetching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [nostrPrivKey, setNostrPrivKey] = useState<string | null>(null)
  const initialRender = useRef(true);

  const { lnAddress, timestamp, jackpot, status, timeLeft, setStatus } = usePusher();

  // validate user input
  useEffect(() => {
    const delayedValidate = setTimeout(async () => {
      setIsValidatingAddress(true)
      const res = await validateLnurl(userAddress);
      setIsValidatingAddress(false);
      console.log(res);
      setIsValidAddress(res.valid);
    }, 300);
    return () => clearTimeout(delayedValidate);
  }, [userAddress]);

  // handle status update
  useEffect(() => {
    console.log('lnAddress', lnAddress, 'timestamp', timestamp, 'jackpot', jackpot, 'status', status, 'timeleft', timeLeft);
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    handleStatusUpdate(status, lnAddress, userAddress, jackpot, timestamp, va, toast);
    setCountdownKey(prevKey => prevKey + 1);

    if (status === 'LOADING') {
      setRefetch(true);
    }
  }, [status, jackpot]);


  useEffect(() => {
    // get lnaddr from local storage
    const lnaddr = localStorage.getItem('lnaddr');
    if (lnaddr) {
      setUserAddress(lnaddr);
    }

    // get nostr hex private key from storage or generate one
    let privKey = localStorage.getItem('privKey');
    if (privKey) {
      setNostrPrivKey(privKey)
    } else {
      privKey = generatePrivateKey()
      localStorage.setItem('privKey', privKey)
    }
   }, []);

  // Get invoice
  useEffect(() => {
    if (fetching || hash || !nostrPrivKey) return;
    setFetching(true);
    getZapInvoice(nostrPrivKey)
      .then((data) => {
        setInvoice(data?.invoice)
        setHash(data?.paymentHash)
        setSettled(false);
        setFetching(false);
      })
  }, [refetch, hash, nostrPrivKey]);

  // Check invoice
  useEffect(() => {
    if (settled || !hash || status === 'LOADING' || checking) return;
    const interval = setInterval(() => {
      if (checking) return;
      checkInvoiceStatus(setChecking, hash, setHash, setSettled, toast, userAddress, setCountdownKey);
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
              isValidAddress={isValidAddress}
              isValidating={isValidatingAddress}
            />
          </div>
          {userAddress && isValidAddress && <Invoice invoice={invoice} toast={toast} /> }
        </div>
      </Loading>
      <Footer />
      <Analytics />
    </main>
  );
}
