"use client";
import Pusher, { type Channel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import {
  NEXT_PUBLIC_CLOCK_DURATION,
  NEXT_PUBLIC_PRESENCE_CHANNEL,
  NEXT_PUBLIC_PUSHER_APP_CLUSTER,
  NEXT_PUBLIC_PUSHER_APP_KEY,
  NEXT_PUBLIC_PUSHER_CHANNEL,
} from "@/lib/publicEnvs";
import type { Payer, Status } from "@/types/payer";

const usePusher = () => {
  const pusher = useRef<Pusher>();
  const lastPayerChannel = useRef<Channel>();
  const presenceChannel = useRef<Channel>();
  // const [uuid, setUuid] = useState<string>("");
  const [lastPayer, setLastPayer] = useState<Payer>({
    lnAddress: "",
    timestamp: 0,
    jackpot: 0,
    timeLeft: 0,
    status: "LOADING",
  });
  const winner = useRef<Payer>({
    lnAddress: "",
    timestamp: 0,
    jackpot: 0,
    timeLeft: 0,
    status: "LOADING",
  });
  const [members, setMembers] = useState<Set<string>>(new Set());

  const addMember = useCallback((id: string) => {
    setMembers((prev) => new Set(prev.add(id)));
  }, []);
  const removeMember = useCallback((id: string) => {
    setMembers((prev) => {
      prev.delete(id);
      return new Set(prev);
    });
  }, []);

  const setStatus = async (status: Status) => {
    if (
      status === "WINNER" &&
      winner.current.status !== "WINNER" &&
      winner.current.timestamp !== lastPayer.timestamp
    ) {
      setLastPayer((lastPayer) => ({ ...lastPayer, status }));
      winner.current = lastPayer;
    }
    setLastPayer((lastPayer) => ({ ...lastPayer, status }));
  };

  // get lnaddr from local storage
  useEffect(() => {
    const uuid = localStorage.getItem("uuid");
    if (!uuid) {
      const id = v4();
      localStorage.setItem("uuid", id);
    }
  }, []);

  useEffect(() => {
    if (pusher.current) return;

    let uuid = localStorage.getItem("uuid");
    if (uuid === null) {
      uuid = v4();
      localStorage.setItem("uuid", uuid ?? "");
    }

    // Pusher.log((message) => {console.log('-- PUSHER --> ', message)})
    pusher.current = new Pusher(NEXT_PUBLIC_PUSHER_APP_KEY, {
      cluster: NEXT_PUBLIC_PUSHER_APP_CLUSTER,
      authEndpoint: `/api/pusher?uuid=${uuid}`,
    });

    presenceChannel.current = pusher.current.subscribe(
      NEXT_PUBLIC_PRESENCE_CHANNEL,
    );
    presenceChannel.current.bind("pusher:subscription_succeeded", (data) => {
      setMembers(new Set(Object.keys(data?.members ?? {})));
    });
    presenceChannel.current.bind("pusher:member_added", (data) => {
      addMember(data.id);
    });
    presenceChannel.current.bind("pusher:member_removed", (data) => {
      removeMember(data.id);
    });

    lastPayerChannel.current = pusher.current.subscribe(
      NEXT_PUBLIC_PUSHER_CHANNEL,
    );
    lastPayerChannel.current.bind("update", (data) => {
      console.log("LAST PAYER update", data);
      const jackpot = parseInt(data.jackpot);
      const lnAddress = data.lnAddress;
      const timeLeft =
        parseInt(NEXT_PUBLIC_CLOCK_DURATION ?? "60") -
        Math.floor((Date.now() - data.timestamp) / 1000);
      let status: Status = "LIVE";
      if (jackpot === 0) {
        status = "WAITING";
      } else if (timeLeft < 0) {
        status = "EXPIRED";
      }
      setLastPayer({
        lnAddress,
        timestamp: data.timestamp,
        jackpot: jackpot,
        status,
        timeLeft,
      });
    });

    lastPayerChannel.current.bind("pusher:cache_miss", (data) => {
      console.log("MISSED CACHE", data);
      setLastPayer({
        lnAddress: "none",
        timestamp: Date.now(),
        jackpot: 0,
        status: "WAITING",
        timeLeft: parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? "60"),
      });
    });

    pusher.current.bind_global((eventName, data) => {
      console.log("GLOBAL", eventName, data);
    });

    return () => {
      pusher.current?.unbind_all();
      pusher.current?.unsubscribe(NEXT_PUBLIC_PUSHER_CHANNEL);
      pusher.current?.unsubscribe(NEXT_PUBLIC_PRESENCE_CHANNEL);
    };
  }, [addMember, removeMember]);

  return { ...lastPayer, setStatus, memberCount: members.size };
};
export default usePusher;
