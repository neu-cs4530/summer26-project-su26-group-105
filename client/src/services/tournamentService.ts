import type { ErrorMsg, GameKey, TournamentInfo, UserAuth } from "@gamenite/shared";
import { api } from "./api.ts";

const TOURNAMENT_API_URL = `/api/tournament`;

/**
 * create a tournament
 */
export const createTournament = async (
  auth: UserAuth,
  gameKey: GameKey,
  gameSize: number,
  bracketSize: number,
  friendOnly: boolean,
): Promise<TournamentInfo> => {
  const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/create`, {
    auth,
    payload: { gameKey, gameSize, bracketSize, friendOnly },
  });
  if ("error" in res.data) throw new Error(res.data.error);
  return res.data;
};

/**
 * Get a single tournament
 */
export const getTournamentById = async (tournamentId: string): Promise<TournamentInfo> => {
  const res = await api.get<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${tournamentId}`);
  if ("error" in res.data) throw new Error(res.data.error);
  return res.data;
};

/**
 * Get all tournaments
 */
export const tournamentList = async (): Promise<TournamentInfo[]> => {
  const res = await api.get<TournamentInfo[] | ErrorMsg>(`${TOURNAMENT_API_URL}/list`);
  if ("error" in res.data) throw new Error(res.data.error);
  return res.data;
};
