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
import { checkInvoiceStatus, handleStatusUpdate, validateLnurl, getZapInvoice, getNewNostrPost } from './utils';
import { Event as NostrEvent } from 'nostr-tools'
import useZaps from '@/hooks/useZaps';
import { MatchStates } from '@/types/matchStates';

const initialMatchState: MatchStates = {
  previousState: "LOADING",
  currentState: "LOADING"
}

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
  const initialRender = useRef(true);
  const [newNote, setNewNote] = useState<NostrEvent | null>(null)
  const { zapChecked, nostrPrivKey, nostrZapCallback } = useZaps(process.env.NEXT_PUBLIC_NOSTR_LIGHTNING_ADDRESS!)
  const [ matchState, setMatchState ] = useState<MatchStates>(initialMatchState)

  const { lnAddress, timestamp, jackpot, status, timeLeft, eventId, setStatus } = usePusher(setMatchState);

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
      console.debug('initial render')
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
   }, []);


  // Get invoice
  useEffect(() => {
    console.debug('MATCH STATE', matchState)
    if (!nostrPrivKey || !nostrZapCallback || fetching || matchState.currentState === "LOADING") return;
    setFetching(true);
    if (matchState.currentState === "WAITING") {
      console.debug('creating new post and fetching zap invoice')
      getNewNostrPost()
        .then((data) => {
          setNewNote(data.event)
          getZapInvoice(nostrPrivKey, nostrZapCallback, data.event.id)
            .then((data) => {
              setInvoice(data?.invoice)
              setHash(data?.paymentHash)
              setSettled(false);
              setFetching(false);
            })
        })
    } else if (matchState.previousState !== "LIVE" && matchState.currentState === "LIVE") {
      console.debug('fetching zap invoice')
      setNewNote(null)
      getZapInvoice(nostrPrivKey, nostrZapCallback, eventId)
        .then((data) => {
          setInvoice(data?.invoice)
          setHash(data?.paymentHash)
          setSettled(false);
          setFetching(false);
        })
    }
  }, [refetch, zapChecked, nostrPrivKey, nostrZapCallback, matchState]);

  // Check invoice
  useEffect(() => {
    if (settled || !hash || status === 'LOADING' || checking) return;
    const interval = setInterval(() => {
      if (checking) return;
      checkInvoiceStatus(setChecking, hash, setHash, setSettled, toast, userAddress, setCountdownKey, newNote, matchState);
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
