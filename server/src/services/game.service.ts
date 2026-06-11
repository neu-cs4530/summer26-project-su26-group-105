import { type GameInfo, type GameKey, type TaggedGameView } from "@gamenite/shared";
import { createChat } from "./chat.service.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { type GameServicer } from "../games/gameServiceManager.ts";
import { nimGameService } from "../games/nim.ts";
import { guessGameService } from "../games/guess.ts";
import { oneGameService } from "../games/one.ts";
import { type GameViewUpdates, type UserWithId } from "../types.ts";
import { GameRepo } from "../repository.ts";
import { getFriends } from "./friend.service.ts";

/**
 * The service interface for individual games
 */
export const gameServices: { [key in GameKey]: GameServicer } = {
  nim: nimGameService,
  guess: guessGameService,
  one: oneGameService,
};

/**
 * Expand a stored game
 *
 * @param gameId - Valid game id
 * @returns the expanded game info object
 */
async function populateGameInfo(gameId: string): Promise<GameInfo> {
  const game = await GameRepo.get(gameId);
  return {
    gameId,
    createdBy: await populateSafeUserInfo(game.createdBy),
    chat: game.chat,
    createdAt: new Date(game.createdAt),
    endedAt: game.endedAt ? new Date(game.endedAt) : undefined,
    winner: game.winner,
    players: await Promise.all(game.players.map(populateSafeUserInfo)),
    type: game.type,
    status: !game.state ? "waiting" : game.done ? "done" : "active",
    minPlayers: gameServices[game.type].minPlayers,
    friendOnly: game.friendOnly ?? false,
  };
}

/** Returns true if userId is a friend of the game creator. */
async function isCreatorFriend(creatorId: string, userId: string): Promise<boolean> {
  const friends = await getFriends(creatorId);
  return friends.some((f) => f.userId === userId);
}

//gets the winner index if the game already stores a winner field
function getStoredWinnerIndex(state: object): number | undefined {
  if (!("winner" in state)) {
    return undefined;
  }

  const winner = state.winner;
  if (typeof winner === "number") {
    return winner;
  }
  return undefined;
}

//gets the winner index for the game Nim
function getNimWinnerIndex(state: object): number | undefined {
  //checks Nim state has field for winner
  if (!("remaining" in state) || !("nextPlayer" in state)) {
    return undefined;
  }

  const remaining = state.remaining;
  const nextPlayer = state.nextPlayer;

  //checks that if no objects are left, then the nextplayer is the winner
  if (remaining === 0 && typeof nextPlayer === "number") {
    return nextPlayer;
  }

  return undefined;
}

//gets the winner index for Number Guesser
function getGuessWinnerIndex(state: object): number | undefined {
  const guessState = state as { secret?: unknown; guesses?: unknown };

  //checks that the secret is a number
  if (typeof guessState.secret !== "number" || !Array.isArray(guessState.guesses)) {
    return undefined;
  }

  const guesses: unknown[] = guessState.guesses;
  let winnerIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  //loops through each player's guess to find which one is closest to the secret
  for (let i = 0; i < guesses.length; i += 1) {
    const guess = guesses[i];
    if (typeof guess !== "number") {
      continue;
    }
    const distance = Math.abs(guess - guessState.secret);

    //updates winner if guess is closest to number
    if (distance < closestDistance) {
      winnerIndex = i;
      closestDistance = distance;
    }
  }

  return winnerIndex;
}

//gets the winner index for a finished game
function getWinnerIndex(type: GameKey, state: unknown): number | undefined {
  //checks if state is an object
  if (typeof state !== "object" || state === null) {
    return undefined;
  }

  const storedWinner = getStoredWinnerIndex(state);

  if (storedWinner !== undefined) {
    return storedWinner;
  }

  if (type === "nim") {
    return getNimWinnerIndex(state);
  }

  if (type === "guess") {
    return getGuessWinnerIndex(state);
  }

  //returns if there is no supported winner logic
  return undefined;
}

/**
 * Create and store a new game
 *
 * @param user - Initial player in the game's waiting room
 * @param type - Game key
 * @param createdAt - Creation time for this game
 * @returns the new game's info object
 */
export async function createGame(
  user: UserWithId,
  type: GameKey,
  createdAt: Date,
  friendOnly: boolean = false,
): Promise<GameInfo> {
  const chat = await createChat(createdAt);
  const gameId = await GameRepo.add({
    type,
    done: false,
    chat: chat.chatId,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    players: [user.userId],
    friendOnly,
  });
  return populateGameInfo(gameId);
}

/**
 * Retrieves a single game from the database. If you expect the id to be valid, use `forceGameById`.
 *
 * @param gameId - Ostensible game id
 * @returns the game's info object, or null
 */
export async function getGameById(gameId: string): Promise<GameInfo | null> {
  const game = await GameRepo.find(gameId);
  if (!game) return null;
  return populateGameInfo(gameId);
}

/**
 * Adds a user to a game that hasn't started yet. If the resulting game object has the maximum
 * allowed number of players, it is the responsibility of the caller to start the game.
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the game's info object, with the `user` listed among the players
 * @throws if the game id is not valid, if the game has started, or if the game cannot accept more
 * players
 */
export async function joinGame(gameId: string, user: UserWithId): Promise<GameInfo> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} joining invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} joining game that started`);
  }
  if (game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} joining game they are in already`);
  }
  if (game.players.length === gameServices[game.type].maxPlayers) {
    throw new Error(`user ${user.username} joining full`);
  }

  // friends-only check, creator is always allowed, others must be friends with creator of game
  if (game.friendOnly && game.createdBy !== user.userId) {
    const isFriend = await isCreatorFriend(game.createdBy, user.userId);
    if (!isFriend) {
      throw new Error(`This is a friends-only game`);
    }
  }

  game.players = [...game.players, user.userId];
  await GameRepo.set(gameId, game);

  return populateGameInfo(gameId);
}

/**
 * Initializes a game that hasn't started yet
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the necessary views for everyone watching the game
 * @throws if the game id is not valid, if the game already started, or if the game lacks enough
 * players to start
 */
export async function startGame(gameId: string, user: UserWithId): Promise<GameViewUpdates> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} starting invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} starting game that started`);
  }

  const key: GameKey = game.type;

  if (game.players.length < gameServices[key].minPlayers) {
    throw new Error(`user ${user.username} starting underpopulated game`);
  }
  if (!game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} starting game they're not in`);
  }
  const { state, views } = gameServices[key].create(game.players);

  game.state = state;
  await GameRepo.set(gameId, game);

  return views;
}

/**
 * Get a list of all games
 *
 * @returns a list of game summaries, ordered reverse chronologically
 */
export async function getGames(): Promise<GameInfo[]> {
  const keys = await GameRepo.getAllKeys();
  const unsorted = await Promise.all(keys.map(populateGameInfo));

  return unsorted.toSorted((game1, game2) => game2.createdAt.getTime() - game1.createdAt.getTime());
}

/**
 * Updates a game state and returns the necessary view updates
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @param move - Unsanitized game move
 * @returns the view updates to send to players and watchers
 * @throws if the game id or move is not valid
 */
export async function updateGame(gameId: string, user: UserWithId, move: unknown) {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} acted on an invalid game`);
  if (!game.state) {
    throw new Error(`user ${user.username} made a move in game of that hadn't started`);
  }
  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  if (playerIndex < 0) {
    throw new Error(`user ${user.username} made a move in a game they weren't playing`);
  }
  const result = gameServices[game.type].update(game.state, move, playerIndex, game.players);
  if (!result) throw new Error(`user ${user.username} made an invalid move in ${game.type}`);

  game.state = result.state;
  const wasAlreadyDone = game.done;
  game.done = game.done || result.done;

  //if game is done, then set the winner
  if (result.done && !wasAlreadyDone) {
    game.endedAt = new Date().toISOString();
    const winnerIndex = getWinnerIndex(game.type, result.state);

    if (winnerIndex !== undefined) {
      game.winner = game.players[winnerIndex];
    }
  }
  await GameRepo.set(gameId, game);

  return result.views;
}

/**
 * View a game as a specific user
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns A boolean for whether that user is a player, the player's view, and the list of players
 */
export async function viewGame(gameId: string, user: UserWithId) {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} viewed an invalid game id`);

  // friends-only check for spectating game, only friends with creator players are allowed in
  const isPlayer = game.players.some((userId) => userId === user.userId);
  if (game.friendOnly && !isPlayer && game.createdBy !== user.userId) {
    const isFriend = await isCreatorFriend(game.createdBy, user.userId);
    if (!isFriend) {
      throw new Error(`This is a friends-only game`);
    }
  }

  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  let view: TaggedGameView | null = null;
  if (game.state) {
    view = gameServices[game.type].view(game.state, playerIndex);
  }
  return {
    isPlayer: playerIndex >= 0,
    view,
    players: await Promise.all(game.players.map(populateSafeUserInfo)),
  };
}
