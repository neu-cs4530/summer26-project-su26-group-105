import type { GameKey } from "@gamenite/shared";

export interface SharedGameStats {
  gameType: GameKey;
  gamesPlayed: number;
  userAWins: number;
  userBWins: number;
}

export interface FriendStats {
  isFriend: boolean;
  totalGamesPlayedTogether: number;
  userATotalWins: number;
  userBTotalWins: number;
  byGame: SharedGameStats[];
}
