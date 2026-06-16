import type { ErrorMsg, TournamentInfo } from "@gamenite/shared";
import { useContext, useEffect, useState } from "react";
import { tournamentList } from "../services/tournamentService.ts";
import useLoginContext from "./useLoginContext.ts";
import { FriendStatusContext } from "../contexts/FriendStatusContext.ts";

/**
 * Custom hook to get the list of all tournaments, applying the same
 * friends-only visibility rules used for games.
 * @returns A message to display (Loading.../error/empty), or a list of tournaments
 */
export default function useTournamentList(): { message: string } | TournamentInfo[] {
  const [tournaments, setTournaments] = useState<TournamentInfo[] | ErrorMsg | null>(null);
  const { user } = useLoginContext();
  const statusMap = useContext(FriendStatusContext);

  useEffect(() => {
    tournamentList()
      .then(setTournaments)
      .catch((err) => {
        setTournaments({ error: `${err}` });
      });
  }, []);

  if (!tournaments) return { message: "Loading..." };
  if ("error" in tournaments) return { message: `Error: ${tournaments.error}` };

  const visible = tournaments.filter((tournament) => {
    if (!tournament.friendOnly) return true;
    if (tournament.createdBy.username === user.username) return true;
    return statusMap.has(tournament.createdBy.username);
  });

  if (visible.length === 0) return { message: "No tournaments found..." };
  return visible;
}
