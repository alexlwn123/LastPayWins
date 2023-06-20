export type Status = 'LIVE' | 'WAITING' | 'EXPIRED' | 'LOADING' | 'WINNER' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED';
export type Payer = {
  lnAddress: string;
  timestamp: number;
  jackpot: number;
  eventId: string;
  status: Status;
}

export type channelData = {
  lnAddress: string;
  timestamp: number;
  jackpot: number;
  eventId: string;
}