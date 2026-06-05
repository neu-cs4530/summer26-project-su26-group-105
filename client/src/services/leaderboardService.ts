import { api } from "./api.ts";
import type { ErrorMsg, GameKey, LeaderboardPlayer } from "@gamenite/shared";

const LEADERBOARD_API_URL = `/api/leaderboard`;

/**
 * Sends a GET request to get leaderboard rows
 * @param type the selected leaderboard, either global or a game type
 * @returns the leaderboard rows for the selected leaderboard
 */
export const getLeaderboardList = async (
  type: "global" | GameKey,
): Promise<LeaderboardPlayer[]> => {
  // sends the selected leaderboard type as a query parameter
  const res = await api.get<LeaderboardPlayer[] | ErrorMsg>(`${LEADERBOARD_API_URL}/list`, {
    params: { type },
  });

  if ("error" in res.data) {
    throw new Error(res.data.error);
  }

  return res.data;
};
