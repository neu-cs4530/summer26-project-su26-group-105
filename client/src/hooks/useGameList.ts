import type { ErrorMsg, GameInfo } from "@gamenite/shared";
import { useContext, useEffect, useState } from "react";
import { gameList } from "../services/gameService.ts";
import useLoginContext from "./useLoginContext.ts";
import { FriendStatusContext } from "../contexts/FriendStatusContext.ts";

/**
 * Custom hook to get the list of all thread summaries and decide on an
 * appropriate message if that list is not available.
 * @param maxSummaries - the maximum number of summaries desired (default is all of them)
 * @returns A message to display to the user (Loading... or an error message), or a list
 */
export default function useGameList(maxGames?: number): { message: string } | GameInfo[] {
  const [games, setGames] = useState<GameInfo[] | ErrorMsg | null>(null);
  const { user } = useLoginContext();
  const statusMap = useContext(FriendStatusContext);

  useEffect(() => {
    gameList()
      .then(setGames)
      .catch((err) => {
        setGames({ error: `${err}` });
      });
  }, []);

  if (!games) return { message: "Loading..." };
  if ("error" in games) return { message: `Error: ${games.error}` };

  const visible = games.filter((game) => {
    // tournament matches are managed from the tournament page, not the open list
    if (game.tournamentId) return false;
    if (!game.friendOnly) return true;
    if (game.createdBy.username === user.username) return true;
    return statusMap.has(game.createdBy.username);
  });

  if (visible.length === 0) return { message: "No games found..." };
  if (maxGames) return visible.slice(0, maxGames);
  return visible;
}
