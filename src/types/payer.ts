export type GameStatus = "LIVE" | "WAITING" | "LOADING";

export type Payer = {
  lnAddress: string;
  timestamp: number;
  jackpot: number;
  timeLeft: number;
  status: GameStatus;
};
