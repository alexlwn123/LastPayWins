"use client";

import { useQuery } from "convex/react";
import type { GameStatus } from "@/types/payer";
import { api } from "../../convex/_generated/api";

const useConvexGame = () => {
  const game = useQuery(api.games.getCurrent);
  const onlineCount = useQuery(api.presence.getOnlineCount);

  if (!game) {
    return {
      lnAddress: "",
      timestamp: 0,
      jackpot: 0,
      status: "LOADING" as GameStatus,
      memberCount: onlineCount ?? 0,
    };
  }

  return {
    lnAddress: game.lnAddress,
    timestamp: game.timestamp,
    jackpot: game.jackpot,
    status: game.status as GameStatus,
    memberCount: onlineCount ?? 0,
  };
};

export default useConvexGame;
