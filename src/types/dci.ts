export interface Corps {
  id: string;
  name: string;
  division: "World Class" | "Open Class" | "All Age";
  logo?: string;
}

export interface DCIEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  status: "upcoming" | "live" | "completed";
  type: "regional" | "finals" | "championship";
}

export interface Market {
  id: string;
  eventId: string;
  title: string;
  description: string;
  type: "placement" | "head_to_head" | "over_under";
  status: "active" | "paused" | "resolved";
  resolvedAt?: string;
  outcomes: Outcome[];
}

export interface Outcome {
  id: string;
  marketId: string;
  title: string;
  description: string;
  odds: number;
  totalBets: number;
  totalVolume: number;
  corpsId?: string; // For placement bets
  position?: number; // For placement bets (1st, 2nd, etc.)
}

export interface Bet {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  amount: number;
  odds: number;
  createdAt: string;
  status: "pending" | "won" | "lost";
}

export interface User {
  id: string;
  address: string;
  balance: number;
  totalBets: number;
  totalWinnings: number;
}