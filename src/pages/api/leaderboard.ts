import { kv } from "@vercel/kv";
import type { NextApiRequest, NextApiResponse } from "next";

export type Winner = {
  lnAddress: string;
  jackpot: number;
  timestamp: number;
  date: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get winners list from KV
    const winners: Winner[] = (await kv.get('winners:list')) || [];
    
    // Return top 10 winners
    const topWinners = winners.slice(0, 10);
    
    res.status(200).json(topWinners);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}