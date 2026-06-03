import { type GameKey, type LeaderboardPlayer } from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { getLeaderboard } from "../services/leaderboard.service.ts";

/**
 * Handles the GET requests to `/api/leaderboard/list` by returning the rows for the
 * selected leaderboard.
 */
export const getList: RestAPI<LeaderboardPlayer[]> = async (req, res) => {
  const type = req.query.type;

  //handles if input is wrong
  if (typeof type !== "string") {
    res.status(400).send({ error: "Missing leaderboard type" });
    return;
  }

  res.send(await getLeaderboard(type as "global" | GameKey));
};
