import { type LeaderboardPlayer } from "@gamenite/shared";
import { z } from "zod";
import { type RestAPI } from "../types.ts";
import { getLeaderboard } from "../services/leaderboard.service.ts";

//limits leaderboard type to only these options
const LeaderboardType = z.enum(["global", "nim", "guess", "one"]);
const DateShowType = z.enum(["all", "daily", "weekly"]);

/**
 * Handles the GET requests to `/api/leaderboard/list` by returning the rows for the
 * selected leaderboard.
 */
export const getList: RestAPI<LeaderboardPlayer[]> = async (req, res) => {
  const typeResult = LeaderboardType.safeParse(req.query.type);
  const dateShowResult = DateShowType.safeParse(req.query.dateShow);

  //handles if input is wrong
  if (!typeResult.success) {
    res.status(400).send({ error: "Invalid leaderboard type" });
    return;
  }
  if (!dateShowResult.success) {
    res.status(400).send({ error: "Invalid date filter" });
    return;
  }

  res.send(
    await getLeaderboard({
      leaderboard: typeResult.data,
      dateShow: dateShowResult.data,
    }),
  );
};
