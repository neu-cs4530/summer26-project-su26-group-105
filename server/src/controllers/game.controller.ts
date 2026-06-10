import { type GameInfo, withAuth, zGameKey, zGameMakeMovePayload } from "@gamenite/shared";
import { type RestAPI, type GameViewUpdates, type SocketAPI, type GameServer } from "../types.ts";
import { GameRepo } from "../repository.ts";
import {
  createGame,
  gameServices,
  getGameById,
  getGames,
  joinGame,
  startGame,
  updateGame,
  viewGame,
} from "../services/game.service.ts";
import { z } from "zod";
import { logSocketError } from "./socket.controller.ts";
import { checkAuth, enforceAuth } from "../services/auth.service.ts";

/**
 * Handle POST requests to `/api/game/create` by creating a game. The game
 * starts with one player, the user who made the POST request.
 */
export const postCreate: RestAPI<GameInfo> = async (req, res) => {
  const body = withAuth(zGameKey).safeParse(req.body);
  if (body.error) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const game = await createGame(user, body.data.payload, new Date());
  res.send(game);
};

/**
 * Handle GET requests to `/api/game/:id`. Returns either 404 or a game info
 * object.
 */
export const getById: RestAPI<GameInfo, { id: string }> = async (req, res) => {
  const game = await getGameById(req.params.id);
  if (!game) {
    res.status(404).send({ error: "Game not found" });
    return;
  }

  res.send(game);
};

/**
 * Handle GET requests to `/api/game/list` by returning information about all
 * games, sorted in reverse chronological order by creation.
 */
export const getList: RestAPI<GameInfo[]> = async (req, res) => {
  res.send(await getGames());
};

/**
 * Each active game player gets a dedicated room that sends messages
 * to just their socket connections. This function derives that room name from
 * the game id and the username.
 *
 * @param gameId - the game id, also the 'base' room name
 * @param userId - user id (not username!)
 * @returns a room name unique to that game id and user
 */
function userRoom(gameId: string, user: string) {
  return `${gameId}-${user}`;
}

/**
 * Handle the socket request sent by a user when they load to a game page. The
 * server's job is to respond with full information about the game's current
 * players and the appropriate view of the game's state. The server also needs
 * to register the user for future updates about the game's state.
 */
export const socketWatch: SocketAPI = (socket) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    const { isPlayer, view, players } = await viewGame(gameId, user);
    const roomsToJoin = isPlayer ? [gameId, userRoom(gameId, user.userId)] : [gameId];
    await socket.join(roomsToJoin);
    socket.emit("gameWatched", { gameId, view, players });
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Broadcast view updates to appropriate users
 */
function sendViewUpdates(io: GameServer, gameId: string, updates: GameViewUpdates) {
  io.to(gameId).emit("gameStateUpdated", { ...updates.watchers, forPlayer: false });
  for (const { userId, view } of updates.players) {
    io.to(userRoom(gameId, userId)).emit("gameStateUpdated", { ...view, forPlayer: true });
  }
}

/**
 * Handle the socket request sent by a user when they try to join a game.
 */
export const socketJoinAsPlayer: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    const game = await joinGame(gameId, user);

    // Let everyone know the user joined (`io` instead of `socket` includes
    // the joiner)
    io.to(gameId).emit("gamePlayersUpdated", game.players);

    // This socket should receive user-specific updates for this game, if it
    // isn't already
    if (!socket.rooms.has(userRoom(gameId, user.userId))) {
      await socket.join(userRoom(gameId, user.userId));
    }

    // If the game is full, it starts automatically
    if (game.players.length === gameServices[game.type].maxPlayers) {
      sendViewUpdates(io, gameId, await startGame(gameId, user));
      const playerUsernames = game.players.map((p) => p.username);
      checkAndRunBotTurn(io, gameId, playerUsernames);
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle a request to start the game.
 */
export const socketStart: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    sendViewUpdates(io, gameId, await startGame(gameId, user));
    const game = await GameRepo.find(gameId);
    if (game) {
      checkAndRunBotTurn(io, gameId, game.players);
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle a request to make a move in a game.
 */
export const socketMakeMove: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { gameId, move },
    } = withAuth(zGameMakeMovePayload).parse(body);
    const user = await enforceAuth(auth);
    const viewUpdates = await updateGame(gameId, user, move);
    sendViewUpdates(io, gameId, viewUpdates);
    const updatedGame = await getGameById(gameId);
    if (updatedGame?.status === "done" && updatedGame.winner) {
      io.emit("leaderboardUpdated", {
        gameType: updatedGame.type,
      });
    }
    const game = await GameRepo.find(gameId);
    if (game) {
      checkAndRunBotTurn(io, gameId, game.players);
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle lobby request to add an automated bot profile
 * Support is only there for "One"
 * edit the if filters if adding more
 */
export const socketAddBot: SocketAPI = (socket, io) => async (body) => {
  const { auth, payload: gameId } = withAuth(z.string()).parse(body);
  const user = await enforceAuth(auth);
  const game = await GameRepo.find(gameId);

  //right now, we only have bot support for "One" game. update if add more
  if (!game || game.state || game.type !== "one" || game.createdBy !== user.userId) return;
  if (game.players.length >= gameServices.one.maxPlayers!) return;

  //bot names lol
  const adjectives = [
    "Blitzing",
    "CardShark",
    "Sneaky",
    "Calculated",
    "Turbo",
    "Savage",
    "Ghostly",
    "Quantum",
  ];
  const botNames = ["Riley", "Nathan", "Sabrina", "Liu", "Alex", "Jordan", "Taylor", "Morgan"];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomBotName = botNames[Math.floor(Math.random() * botNames.length)];

  // Combines them into a distinct username variant (e.g., "SneakySabrina" or "TurboRiley")
  const combinedName = `${randomAdjective}${randomBotName}`;
  const uniqueBotId = `bot_${Math.random().toString(36).substring(2, 8)}:${combinedName}`;

  game.players.push(uniqueBotId);
  await GameRepo.set(gameId, game);

  const expandedGameInfo = await getGameById(gameId);
  if (expandedGameInfo) {
    io.to(gameId).emit("gamePlayersUpdated", expandedGameInfo.players);
  }

  if (game.players.length === gameServices.one.maxPlayers) {
    sendViewUpdates(io, gameId, await startGame(gameId, user));
    checkAndRunBotTurn(io, gameId, game.players);
  }
};

/**
 * Game-agnostic bot turn
 * Automatically checks if the next player is a bot and executes their move
 * using the registered bot brain for that specific game type.
 */
function checkAndRunBotTurn(io: GameServer, gameId: string, currentPlayers: string[]) {
  // 1-second pause for UI readability
  setTimeout(async () => {
    const game = await GameRepo.find(gameId);
    if (!game || !game.state || game.done) return;

    // Find the service matching this game type (e.g., 'one', 'nim', etc)
    const service = gameServices[game.type];

    // If this game engine doesn't support bots, just return
    if (!service || !service.generateBotMove) return;

    const stateWithTurn = game.state as { nextPlayer: number };
    const nextPlayerId = currentPlayers[stateWithTurn.nextPlayer];

    // Detect if the next player is a bot
    if (nextPlayerId && nextPlayerId.startsWith("bot_")) {
      // Calculate the move using the game's registered service handler
      const stateWithTurn = game.state as { nextPlayer: number };
      const botMove = service.generateBotMove(game.state, stateWithTurn.nextPlayer);
      if (!botMove) return;

      // Execute the move
      const viewUpdates = await updateGame(
        gameId,
        { userId: nextPlayerId, username: nextPlayerId },
        botMove,
      );

      // Broadcast updates
      sendViewUpdates(io, gameId, viewUpdates);

      // Recursively trigger the check for back-to-back bot sequences
      checkAndRunBotTurn(io, gameId, currentPlayers);
    }
  }, 1000);
}
