"use client";

import { useMutation } from "convex/react";
import { useEffect } from "react";
import { useUuid } from "@/components/UuidProvider";
import { api } from "../../convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 10_000;

type UseConvexPresenceProps = {
  lnAddress?: string | null;
};

const useConvexPresence = ({ lnAddress }: UseConvexPresenceProps = {}) => {
  const heartbeat = useMutation(api.presence.heartbeat);
  const disconnect = useMutation(api.presence.disconnect);
  const uuid = useUuid();

  // Send heartbeats with optional lnAddress
  useEffect(() => {
    if (!uuid) return;

    const sendHeartbeat = () => {
      heartbeat({
        uuid: uuid,
        lnAddress: lnAddress ?? undefined,
      });
    };

    // Initial heartbeat
    sendHeartbeat();

    // Regular heartbeats
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      disconnect({ uuid: uuid });
    };
  }, [uuid, lnAddress, heartbeat, disconnect]);

  return { uuid };
};

export default useConvexPresence;
