import { useEffect, useState } from "react";
import type { TournamentInfo } from "@gamenite/shared";
import useAuth from "./useAuth.ts";
import useLoginContext from "./useLoginContext.ts";

/**
 * Hook for Tournament sockets
 *
 * @param tournamentId - the tournament to watch
 * @throws if outside a LoginContext
 * @returns an object containing:
 * - `tournament`: the latest tournament info, or null before it loads
 * - `error`: the most recent error message, or null
 * - `join`: registers the current user for the tournament
 */
export default function useTournament(tournamentId: string) {
  const { socket } = useLoginContext();
  const auth = useAuth();
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdated = (info: TournamentInfo) => {
      if (info.tournamentId !== tournamentId) return;
      setTournament(info);
      setError(null);
    };
    const handleError = ({ error }: { error: string }) => {
      setError(error);
    };

    socket.on("tournamentUpdated", handleUpdated);
    socket.on("tournamentError", handleError);
    socket.emit("tournamentWatch", { auth, payload: tournamentId });

    return () => {
      socket.off("tournamentUpdated", handleUpdated);
      socket.off("tournamentError", handleError);
    };
  }, [tournamentId, socket, auth]);

  function join() {
    socket.emit("tournamentJoin", { auth, payload: tournamentId });
  }

  return { tournament, error, join };
}
