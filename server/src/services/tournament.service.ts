import { type GameKey, type TournamentInfo, isPowerOf, validBracketSizes } from "@gamenite/shared";
import { TournamentRepo, GameRepo } from "../repository.ts";
import { type UserWithId } from "../types.ts";
import { type TournamentRecord } from "../models.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { getFriends } from "./friend.service.ts";
import { createTournamentMatch, gameServices, getGameInfo } from "./game.service.ts";

/**
 * Expand a stored tournament into the info object sent to clients, including
 * the populated participants, champion, and every match grouped by round
 *
 * @param tournamentId - Valid tournament id
 * @returns the expanded tournament info object
 */
export async function populateTournamentInfo(tournamentId: string): Promise<TournamentInfo> {
  const tournament = await TournamentRepo.get(tournamentId);
  return {
    tournamentId,
    type: tournament.type,
    status: tournament.status,
    gameSize: tournament.gameSize,
    bracketSize: tournament.bracketSize,
    participants: await Promise.all(tournament.participants.map(populateSafeUserInfo)),
    rounds: await Promise.all(
      tournament.rounds.map((round) => Promise.all(round.map(getGameInfo))),
    ),
    champion: tournament.champion ? await populateSafeUserInfo(tournament.champion) : undefined,
    createdBy: await populateSafeUserInfo(tournament.createdBy),
    createdAt: new Date(tournament.createdAt),
    friendOnly: tournament.friendOnly ?? false,
  };
}

/** Returns true if userId is a friend of the tournament creator */
async function isCreatorFriend(creatorId: string, userId: string): Promise<boolean> {
  const friends = await getFriends(creatorId);
  return friends.some((f) => f.userId === userId);
}

/**
 * Split a list of players into consecutive matches of `gameSize` players each
 *
 * @param players - The players to divy up
 * @param gameSize - Players per match
 * @returns an array of player-id groups, one per match
 */
export function partitionIntoMatches(players: string[], gameSize: number): string[][] {
  const matches: string[][] = [];
  for (let i = 0; i < players.length; i += gameSize) {
    matches.push(players.slice(i, i + gameSize));
  }
  return matches;
}

/**
 * Validate that the requested match size and bracket size form a tournament
 *
 * @throws if the game size is outside the game type's allowed range or the
 * bracket size is not a valid power of the game size
 */
function validateBracket(type: GameKey, gameSize: number, bracketSize: number): void {
  const { minPlayers, maxPlayers } = gameServices[type];
  if (gameSize < minPlayers) {
    throw new Error(`A ${type} match needs at least ${minPlayers} players`);
  }
  if (maxPlayers !== null && gameSize > maxPlayers) {
    throw new Error(`A ${type} match allows at most ${maxPlayers} players`);
  }
  if (!isPowerOf(bracketSize, gameSize) || !validBracketSizes(gameSize).includes(bracketSize)) {
    throw new Error(`Bracket size ${bracketSize} must be a power of the match size ${gameSize}`);
  }
}

/**
 * Create and store a new tournament in the registering state, with its creator
 * as the first participant.
 *
 * @param user - The creator, who is automatically registered
 * @param type - Game key played in every match
 * @param gameSize - Players per match
 * @param bracketSize - Total participants required to fill the bracket
 * @param friendOnly - If true, only friends of the creator may register
 * @param createdAt - Creation time
 * @returns the new tournament's info object
 */
export async function createTournament(
  user: UserWithId,
  type: GameKey,
  gameSize: number,
  bracketSize: number,
  friendOnly: boolean,
  createdAt: Date,
): Promise<TournamentInfo> {
  validateBracket(type, gameSize, bracketSize);
  const tournamentId = await TournamentRepo.add({
    type,
    status: "registering",
    gameSize,
    bracketSize,
    participants: [user.userId],
    rounds: [],
    createdBy: user.userId,
    createdAt: createdAt.toISOString(),
    friendOnly,
  });
  return populateTournamentInfo(tournamentId);
}

/**
 * Retrieves a single tournament, or null if the id is not valid
 */
export async function getTournamentById(tournamentId: string): Promise<TournamentInfo | null> {
  const tournament = await TournamentRepo.find(tournamentId);
  if (!tournament) return null;
  return populateTournamentInfo(tournamentId);
}

/**
 * Get a list of all tournaments, ordered reverse chronologically
 */
export async function getTournaments(): Promise<TournamentInfo[]> {
  const keys = await TournamentRepo.getAllKeys();
  const unsorted = await Promise.all(keys.map(populateTournamentInfo));
  return unsorted.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Build the matches for a round from a list of advancing players and store
 * them on the tournament as a new round
 *
 * @param tournament - The tournament record
 * @param tournamentId - The tournament's id
 * @param players - The players advancing into this round
 * @param round - The 0-indexed round number being created
 */
async function createRound(
  tournament: TournamentRecord,
  tournamentId: string,
  players: string[],
  round: number,
): Promise<void> {
  const groups = partitionIntoMatches(players, tournament.gameSize);
  const matchIds = await Promise.all(
    groups.map((group) =>
      createTournamentMatch(
        tournament.type,
        group,
        tournamentId,
        round,
        tournament.createdBy,
        new Date(),
        tournament.friendOnly ?? false,
      ),
    ),
  );
  tournament.rounds[round] = matchIds;
}

/**
 * Register a user for a tournament
 * @param tournamentId - tournament id
 * @param user - Authenticated user
 * @returns the updated tournament info
 * @throws if the id is invalid, registration is closed, the user is already
 * registered, the bracket is full, or a friends-only check fails
 */
export async function joinTournament(
  tournamentId: string,
  user: UserWithId,
): Promise<TournamentInfo> {
  const tournament = await TournamentRepo.find(tournamentId);
  if (!tournament) throw new Error(`user ${user.username} joining invalid tournament`);
  if (tournament.status !== "registering") {
    throw new Error(`This tournament has already started`);
  }
  if (tournament.participants.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} already registered for this tournament`);
  }
  if (tournament.participants.length >= tournament.bracketSize) {
    throw new Error(`This tournament is full`);
  }
  // friends-only check
  if (tournament.friendOnly && tournament.createdBy !== user.userId) {
    const isFriend = await isCreatorFriend(tournament.createdBy, user.userId);
    if (!isFriend) {
      throw new Error(`This is a friends-only tournament`);
    }
  }

  tournament.participants = [...tournament.participants, user.userId];

  // once the bracket is full, lock registration and launch the first round
  if (tournament.participants.length === tournament.bracketSize) {
    tournament.status = "active";
    await createRound(tournament, tournamentId, tournament.participants, 0);
  }

  await TournamentRepo.set(tournamentId, tournament);
  return populateTournamentInfo(tournamentId);
}

/**
 * Advance a tournament after one of its matches finishes. If every match in the
 * current round is done, the winners are put in a new round (or there is one left)
 *
 * @param tournamentId - The tournament owning the finished match
 * @returns the updated tournament info, or null if the id is not a tournament
 */
export async function advanceTournament(tournamentId: string): Promise<TournamentInfo | null> {
  const tournament = await TournamentRepo.find(tournamentId);
  if (!tournament || tournament.status !== "active") return null;

  const currentRoundIndex = tournament.rounds.length - 1;
  const currentRound = tournament.rounds[currentRoundIndex];
  const games = await Promise.all(currentRound.map((id) => GameRepo.get(id)));

  // wait until every match in the round has finished
  if (!games.every((game) => game.done)) {
    return populateTournamentInfo(tournamentId);
  }

  const winners = games
    .map((game) => game.winner)
    .filter((winner): winner is string => winner !== undefined);

  if (winners.length <= 1) {
    tournament.status = "done";
    tournament.champion = winners[0];
  } else {
    await createRound(tournament, tournamentId, winners, currentRoundIndex + 1);
  }

  await TournamentRepo.set(tournamentId, tournament);
  return populateTournamentInfo(tournamentId);
}
