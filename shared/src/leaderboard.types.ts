import type { GameKey } from "./game.types.ts";

//creates the type for each column in the leaderboard table
export type LeaderboardPlayer = {
  rank: number;
  status: string;
  profilePictureUrl: string;
  username: string;
  display: string;
  totalGames: number;
  totalWins: number;
  gameWins: Partial<Record<GameKey, number>>;
};
