import { api } from "./api.ts";
import type { ErrorMsg, LeaderboardPlayer, LeaderboardServerFilters } from "@gamenite/shared";

const LEADERBOARD_API_URL = `/api/leaderboard`;

/**
 * Sends a GET request to get leaderboard rows
 * @param filters the selected leaderboard type and time range
 * @returns the leaderboard rows for the selected leaderboard
 */
export const getLeaderboardList = async (
  filters: LeaderboardServerFilters,
): Promise<LeaderboardPlayer[]> => {
  // sends the selected leaderboard type and time as a query parameter
  const res = await api.get<LeaderboardPlayer[] | ErrorMsg>(`${LEADERBOARD_API_URL}/list`, {
    params: { type: filters.leaderboard, dateShow: filters.dateShow },
  });

  if ("error" in res.data) {
    throw new Error(res.data.error);
  }

  return res.data;
};
