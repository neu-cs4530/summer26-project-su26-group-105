import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  socketWatch,
  socketJoinAsPlayer,
  socketStart,
  socketMakeMove,
  socketFriendGameCreated,
} from "../src/controllers/game.controller.ts";
import { ChatRepo, FriendRepo, GameRepo, UserRepo } from "../src/repository.ts";
import { createUser } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { createGame, joinGame, startGame } from "../src/services/game.service.ts";
import type { GameServerSocket, GameServer, UserWithId } from "../src/types.ts";

// mock helpers
function makeMockSocket() {
  const socket = {
    emit: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    rooms: new Set<string>(),
  };
  return socket as unknown as GameServerSocket & {
    emit: ReturnType<typeof vi.fn>;
    join: ReturnType<typeof vi.fn>;
  };
}

function makeMockIo() {
  const toChain = { emit: vi.fn() };
  const io = {
    to: vi.fn().mockReturnValue(toChain),
    emit: vi.fn(),
  };
  return { io: io as unknown as GameServer, toChain };
}

let userA: UserWithId;
let userB: UserWithId;

beforeEach(async () => {
  await UserRepo.clear();
  await FriendRepo.clear();
  await GameRepo.clear();
  await ChatRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());

  const aAuth = await getUserByUsername("alice");
  const bAuth = await getUserByUsername("bob");
  userA = { userId: aAuth!.userId, username: "alice" };
  userB = { userId: bAuth!.userId, username: "bob" };
});

// socket watch tests
describe("socketWatch", () => {
  it("emits gameWatched for a valid game", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: game.gameId,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "gameWatched",
      expect.objectContaining({ gameId: game.gameId }),
    );
  });

  it("emits gameWatchError for invalid game id", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: "nonexistent-game",
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "gameWatchError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("emits gameWatchError on bad auth", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: game.gameId,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "gameWatchError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("joins the game room", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: game.gameId,
    });

    expect(socket.join).toHaveBeenCalled();
  });
});

// socket joins as player tests
describe("socketJoinAsPlayer", () => {
  it("emits gamePlayersUpdated when user joins", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketJoinAsPlayer(
      socket,
      io,
    )({
      auth: { username: "bob", password: "pwdB" },
      payload: game.gameId,
    });

    expect(toChain.emit).toHaveBeenCalledWith("gamePlayersUpdated", expect.any(Array));
  });

  it("does not emit gamePlayersUpdated on bad auth", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketJoinAsPlayer(
      socket,
      io,
    )({
      auth: { username: "bob", password: "wrong" },
      payload: game.gameId,
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("gamePlayersUpdated", expect.any(Array));
  });
});

// socket start tests
describe("socketStart", () => {
  it("emits gameStateUpdated when game starts", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketStart(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: game.gameId,
    });

    expect(toChain.emit).toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  });

  it("does not emit gameStateUpdated on bad auth", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketStart(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: game.gameId,
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  });
});

// socket friend game creation tests
describe("socketFriendGameCreated", () => {
  it("completes without error for valid auth", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await expect(
      socketFriendGameCreated(
        socket,
        io,
      )({
        auth: { username: "alice", password: "pwdA" },
        payload: game.gameId,
      }),
    ).resolves.not.toThrow();
  });

  it("does not emit notificationPopup on bad auth", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketFriendGameCreated(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: "some-game-id",
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("notificationPopup", expect.any(Object));
  });
});

// socket make move tests
describe("socketMakeMove", () => {
  it("emits gameStateUpdated for a valid move", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketMakeMove(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { gameId: game.gameId, move: 1 },
    });

    expect(toChain.emit).toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  });

  it("does not emit gameStateUpdated on bad auth", async () => {
    const game = await createGame(userA, "nim", new Date());
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketMakeMove(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: { gameId: game.gameId, move: 1 },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  });
});
