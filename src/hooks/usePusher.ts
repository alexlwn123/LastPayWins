'use client'
import { Payer } from "@/types/payer";
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
  });

  useEffect(() => {
    if (pusher.current) return;
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
      const timeLeft = 60 - Math.floor((Date.now() - data.timestamp) / 1000);
      setLastPayer({ lnAddress, timestamp: data.timestamp, jackpot: jackpot })
    });

    lastPayerChannel.current.bind("pusher:cache_miss", (data) => {
      console.log('MISSED CACHE', data);
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