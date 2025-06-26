export type Status =
	| "LIVE"
	| "WAITING"
	| "EXPIRED"
	| "LOADING"
	| "WINNER"
	| "PAYMENT_SUCCESS"
	| "PAYMENT_FAILED";
export type Payer = {
	lnAddress: string;
	timestamp: number;
	jackpot: number;
	timeLeft: number;
	status: Status;
};
