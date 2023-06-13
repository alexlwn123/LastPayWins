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
import { handleStatusUpdate, validateLnurl } from './utils';
import { checkInvoiceStatus } from './utils/invoice';
import { getZapInvoice, getNewNostrPost } from './utils/nostr';
import { Event as NostrEvent } from 'nostr-tools'
import useZaps from '@/hooks/useZaps';
import { MatchState } from '@/types/matchStates';


export default function Home() {
  const [userAddress, setUserAddress] = useState('');
  const [countdownKey, setCountdownKey] = useState<number>(0)
  const [checking, setChecking] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const initialRender = useRef(true);
  const [ matchState, setMatchState ] = useState<MatchState>("LOADING")
  const { lnAddress, timestamp, jackpot, status, timeLeft, eventId, setStatus } = usePusher(setMatchState);
  const { hash, setHash, settled, setSettled, fetching, setRefetch, newNote, invoice } = useZaps(process.env.NEXT_PUBLIC_NOSTR_LIGHTNING_ADDRESS!, matchState, eventId)

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
    console.log('lnAddress', lnAddress, 'timestamp', timestamp, 'jackpot', jackpot, 'status', status, 'timeleft', timeLeft, 'eventId', eventId);
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    handleStatusUpdate(status, lnAddress, userAddress, jackpot, timestamp, va, toast);
    setCountdownKey(prevKey => prevKey + 1);
  }, [status, jackpot]);


  useEffect(() => {
    // get lnaddr from local storage
    const lnaddr = localStorage.getItem('lnaddr');
    if (lnaddr) {
      setUserAddress(lnaddr);
    }
   }, []);

  // Check invoice
  useEffect(() => {
    if (settled || !hash || status === 'LOADING' || checking) return;
    const interval = setInterval(() => {
      if (checking) return;
      checkInvoiceStatus(setChecking, hash, setHash, setSettled, toast, userAddress, setCountdownKey, newNote, matchState, setRefetch);
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
              setMatchState={setMatchState}
              isWinning={lnAddress === userAddress}
              toast={toast}
              displayingInvoice={isValidAddress}
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
