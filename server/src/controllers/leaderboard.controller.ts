import { type LeaderboardPlayer } from "@gamenite/shared";
import { z } from "zod";
import { type RestAPI } from "../types.ts";
import { getLeaderboard } from "../services/leaderboard.service.ts";

//limits leaderboard type to only these options
const LeaderboardType = z.enum(["global", "nim", "guess"]);

/**
 * Handles the GET requests to `/api/leaderboard/list` by returning the rows for the
 * selected leaderboard.
 */
export const getList: RestAPI<LeaderboardPlayer[]> = async (req, res) => {
  const typeResult = LeaderboardType.safeParse(req.query.type);

  //handles if input is wrong
  if (!typeResult.success) {
    res.status(400).send({ error: "Invalid leaderboard type" });
    return;
  }

  res.send(await getLeaderboard(typeResult.data));
};
