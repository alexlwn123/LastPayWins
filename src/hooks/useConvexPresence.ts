"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { v4 } from "uuid";
import { api } from "../../convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 10_000;

const useConvexPresence = () => {
  const [uuid, setUuid] = useState<string | null>(null);
  const heartbeat = useMutation(api.presence.heartbeat);
  const disconnect = useMutation(api.presence.disconnect);

  // Get or create UUID
  useEffect(() => {
    const existingId = localStorage.getItem("uuid");
    if (existingId) {
      setUuid(existingId);
    } else {
      const id = v4();
      localStorage.setItem("uuid", id);
      setUuid(id);
    }
  }, []);

  // Send heartbeats
  useEffect(() => {
    if (!uuid) return;

    // Initial heartbeat
    heartbeat({ oduc: uuid });

    // Regular heartbeats
    const interval = setInterval(() => {
      heartbeat({ oduc: uuid });
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      disconnect({ oduc: uuid });
    };
  }, [uuid, heartbeat, disconnect]);

  return { uuid };
};

export default useConvexPresence;
