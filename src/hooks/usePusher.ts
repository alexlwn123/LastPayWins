'use client'
import { Payer, Status } from "@/types/payer";
import Pusher, { Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";

const appKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY!;
const cluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!;

const usePusher = () => {
  const pusher = useRef<Pusher>();
  const timerChannel = useRef<Channel>();
  const lastPayerChannel = useRef<Channel>();
  const [lastPayer, setLastPayer] = useState<Payer>({
    lnAddress: '',
    timestamp: 0,
    jackpot: 0,
    timeLeft: 0,
    status: 'LOADING'
  });

  useEffect(() => {
    if (pusher.current) return;

    // Pusher.log((message) => {console.log('-- PUSHER --> ', message)})
    pusher.current = new Pusher(appKey, {
      cluster: cluster,
    });
    timerChannel.current = pusher.current.subscribe("cache-timer");
    lastPayerChannel.current = pusher.current.subscribe("cache-last-payer");

    timerChannel.current.bind("reset", () => {
      console.log('RESET');
    });

    lastPayerChannel.current.bind("update", (data) => {
      console.log('LAST PAYER update', data);
      const jackpot = parseInt(data.jackpot);
      const lnAddress = data.lnAddress;
      const timeLeft = parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') - Math.floor((Date.now() - data.timestamp) / 1000);
      let status: Status = 'LIVE';
      if (jackpot === 0) {
        status = 'WAITING';
      } else if (timeLeft < 0) {
        status = 'EXPIRED';
      }
      setLastPayer({ lnAddress, timestamp: data.timestamp, jackpot: jackpot, status, timeLeft })
    });

    lastPayerChannel.current.bind("pusher:cache_miss", (data) => {
      console.log('MISSED CACHE', data);
      setLastPayer({ lnAddress: 'none', timestamp: Date.now(), jackpot: 0, status: 'WAITING', timeLeft: parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? '60') })
    });

    pusher.current.bind_global((eventName, data) => {
      console.log('GLOBAL', eventName, data);
    })

    return () => {
      pusher.current?.unbind_all();
    }

  }, []);

  return lastPayer;
};
export default usePusher;