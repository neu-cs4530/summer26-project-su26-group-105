import type { GameKey } from "./game.types.ts";
import type { SafeUserInfo } from "./user.types.ts";

//leaderboard can either be global or for a specific game id
export type LeaderboardFilter = "global" | GameKey;
//leaderboard can filter between all time, daily, and weekly
export type DateShow = "all" | "daily" | "weekly";

//creates the type for filters that the backend needs to calculate the correct leaderboard
export type LeaderboardServerFilters = {
  leaderboard: LeaderboardFilter;
  dateShow: DateShow;
};

//creates the type for each column in the leaderboard table
export type LeaderboardPlayer = {
  rank: number;
  status: string;
  user: SafeUserInfo;
  totalGames: number;
  totalWins: number;
  gameWins: Partial<Record<GameKey, number>>;
};
