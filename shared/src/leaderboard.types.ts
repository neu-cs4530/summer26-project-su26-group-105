import type { GameKey } from "./game.types.ts";
import type { SafeUserInfo } from "./user.types.ts";

//creates the type for each column in the leaderboard table
export type LeaderboardPlayer = {
  rank: number;
  status: string;
  user: SafeUserInfo;
  totalGames: number;
  totalWins: number;
  gameWins: Partial<Record<GameKey, number>>;
};
