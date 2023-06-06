export type MatchState = "LOADING" | "WAITING" | "LIVE"
export interface MatchStates {
  previousState: MatchState;
  currentState: MatchState;
}
