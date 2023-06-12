export type MatchState = "LOADING" | "WAITING" | "LIVE"

export type MatchStates = {
  previousState: MatchState;
  currentState: MatchState;
}
