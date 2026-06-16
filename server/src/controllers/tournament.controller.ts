import { type TournamentInfo, withAuth, zCreateTournamentPayload } from "@gamenite/shared";
import { z } from "zod";
import { type RestAPI, type SocketAPI } from "../types.ts";
import { checkAuth, enforceAuth } from "../services/auth.service.ts";
import {
  createTournament,
  getTournamentById,
  getTournaments,
  joinTournament,
  populateTournamentInfo,
} from "../services/tournament.service.ts";
import { logSocketError } from "./socket.controller.ts";

/** The socket room that receives live bracket updates for a tournament. */
export function tournamentRoom(tournamentId: string): string {
  return `tournament-${tournamentId}`;
}

/**
 * creating a tournament
 * The tournament starts in the registering state with its creator registered
 */
export const postCreate: RestAPI<TournamentInfo> = async (req, res) => {
  const body = withAuth(zCreateTournamentPayload).safeParse(req.body);
  if (body.error) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  try {
    const tournament = await createTournament(
      user,
      body.data.payload.gameKey,
      body.data.payload.gameSize,
      body.data.payload.bracketSize,
      body.data.payload.friendOnly,
      new Date(),
    );
    res.send(tournament);
  } catch (err) {
    res.status(400).send({ error: err instanceof Error ? err.message : "Unable to create" });
  }
};

/**
 * return all tournaments
 * sorted in reverse chronological order by creation
 */
export const getList: RestAPI<TournamentInfo[]> = async (req, res) => {
  res.send(await getTournaments());
};

/**
 * returns a tournament or an error
 */
export const getById: RestAPI<TournamentInfo, { id: string }> = async (req, res) => {
  const tournament = await getTournamentById(req.params.id);
  if (!tournament) {
    res.status(404).send({ error: "Tournament not found" });
    return;
  }
  res.send(tournament);
};

/**
 * opens a tournament page
 * Joins the tournament's room and sends the current state
 */
export const socketWatch: SocketAPI = (socket) => async (body) => {
  try {
    const { auth, payload: tournamentId } = withAuth(z.string()).parse(body);
    await enforceAuth(auth);
    await socket.join(tournamentRoom(tournamentId));
    socket.emit("tournamentUpdated", await populateTournamentInfo(tournamentId));
  } catch (err) {
    socket.emit("tournamentError", {
      error: err instanceof Error ? err.message : "Unable to view tournament",
    });
    logSocketError(socket, err);
  }
};

/**
 * registers for a tournament. Adds the user, then broadcasts the updated bracket to everyone
 * When this registration fills the bracket, the first round of matches is created
 */
export const socketJoin: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: tournamentId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    const tournament = await joinTournament(tournamentId, user);
    io.to(tournamentRoom(tournamentId)).emit("tournamentUpdated", tournament);
  } catch (err) {
    socket.emit("tournamentError", {
      error: err instanceof Error ? err.message : "Unable to join tournament",
    });
    logSocketError(socket, err);
  }
};
