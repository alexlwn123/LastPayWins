export type Status = 'LIVE' | 'WAITING' | 'EXPIRED' | 'LOADING';
export type Payer = {
  lnAddress: string;
  timestamp: number;
  jackpot: number;
  timeLeft: number;
  status: Status;
}