'use client'
import { Payer, Status, channelData } from "@/types/payer";
import Pusher, { Channel } from "pusher-js";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import va from "@vercel/analytics";
import { MatchStates } from "@/types/matchStates";

const appKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY!;
const cluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!;

const usePusher = (setMatchState: Dispatch<SetStateAction<MatchStates>>) => {
  const pusher = useRef<Pusher>();
  const lastPayerChannel = useRef<Channel>();
  const [lastPayer, setLastPayer] = useState<Payer>({
    lnAddress: '',
    timestamp: 0,
    jackpot: 0,
    timeLeft: 0,
    eventId: '',
    status: 'LOADING'
  });
  const winner = useRef<Payer>({
    lnAddress: '',
    timestamp: 0,
    jackpot: 0,
    timeLeft: 0,
    eventId: '',
    status: 'LOADING'
  });

  const setStatus = async (status: Status) => {
    if (status === 'WINNER' && winner.current.status !== 'WINNER' && winner.current.timestamp !== lastPayer.timestamp) {
      setLastPayer((lastPayer) => ({ ...lastPayer, status }));
      winner.current = lastPayer;
    }
    setLastPayer((lastPayer) => ({ ...lastPayer, status }));
  }

  useEffect(() => {
    if (pusher.current) return;

    // Pusher.log((message) => {console.log('-- PUSHER --> ', message)})
    pusher.current = new Pusher(appKey, {
      cluster: cluster,
    });
    const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
    lastPayerChannel.current = pusher.current.subscribe(channel);

    lastPayerChannel.current.bind("update", (data: channelData) => {
      console.log('LAST PAYER update', data);
      let jackpot = data.jackpot;
      const lnAddress = data.lnAddress;
      const timeLeft = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') - Math.floor((Date.now() - data.timestamp) / 1000);
      let eventId = data.eventId
      let status: Status = 'LIVE';
      if (jackpot === 0) {
        status = 'WAITING';
        eventId = ''
      } else if (timeLeft < 0) {
        status = 'EXPIRED';
        eventId = ''
      }
      if (jackpot === 0 || timeLeft < 0) {
        setMatchState((prev) => ({
          previousState: prev.currentState,
          currentState: "WAITING"
        }))
      } else {
        setMatchState((prev) => ({
          previousState: prev.currentState,
          currentState: "LIVE"
        }))
      }
      setLastPayer({ lnAddress, timestamp: data.timestamp, jackpot: jackpot, status, timeLeft, eventId })
    });

    lastPayerChannel.current.bind("pusher:cache_miss", (data) => {
      console.log('MISSED CACHE', data);
      setMatchState({ previousState: "LOADING", currentState: "WAITING"})
      setLastPayer({ lnAddress: 'none', timestamp: Date.now(), jackpot: 0, status: 'WAITING', timeLeft: parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60'), eventId: '' })
    });

    pusher.current.bind_global((eventName, data) => {
      console.log('GLOBAL', eventName, data);
    })

    return () => {
      pusher.current?.unbind_all();
      pusher.current?.unsubscribe(channel)
    }

  }, []);

  return { ...lastPayer, setStatus };
};
export default usePusher;