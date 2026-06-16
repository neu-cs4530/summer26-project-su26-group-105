import { describe, it, expect, beforeEach } from "vitest";
import {
  createGame,
  getGameById,
  getReplayState,
  joinGame,
  startGame,
  getGames,
  updateGame,
  viewGame,
  voteReplay,
} from "../../src/services/game.service.ts";
import { FriendRepo, GameRepo, UserRepo, ChatRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { sendFriendRequest, acceptFriendRequest } from "../../src/services/friend.service.ts";
import type { UserWithId } from "../../src/types.ts";

let userA: UserWithId;
let userB: UserWithId;
let userC: UserWithId;

beforeEach(async () => {
  await GameRepo.clear();
  await UserRepo.clear();
  await FriendRepo.clear();
  await ChatRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());
  await createUser("catherine", "pwdC", new Date());

  const aAuth = await getUserByUsername("alice");
  const bAuth = await getUserByUsername("bob");
  const cAuth = await getUserByUsername("catherine");

  userA = { userId: aAuth!.userId, username: "alice" };
  userB = { userId: bAuth!.userId, username: "bob" };
  userC = { userId: cAuth!.userId, username: "catherine" };
});

async function makeFriends(fromId: string, toId: string) {
  const { friendId } = (await sendFriendRequest(fromId, toId)) as { friendId: string };
  await acceptFriendRequest(friendId, toId);
}

// tests creating game (different types, friends-only, info)
describe("createGame", () => {
  it("creates a game and returns GameInfo", async () => {
    const game = await createGame(userA, "nim", new Date());
    expect(game.type).toBe("nim");
    expect(game.status).toBe("waiting");
    expect(game.players).toHaveLength(1);
    expect(game.players[0].username).toBe("alice");
    expect(game.createdBy.username).toBe("alice");
    expect(game.friendOnly).toBe(false);
  });

  it("creates a friend-only game", async () => {
    const game = await createGame(userA, "nim", new Date(), true);
    expect(game.friendOnly).toBe(true);
  });

  it("creates games of different types", async () => {
    const nim = await createGame(userA, "nim", new Date());
    const guess = await createGame(userA, "guess", new Date());
    expect(nim.type).toBe("nim");
    expect(guess.type).toBe("guess");
  });
});

// gets game by ID
describe("getGameById", () => {
  it("returns null for nonexistent game", async () => {
    const result = await getGameById("nonexistent-id");
    expect(result).toBeNull();
  });

  it("returns the game for a valid id", async () => {
    const created = await createGame(userA, "nim", new Date());
    const found = await getGameById(created.gameId);
    expect(found).not.toBeNull();
    expect(found!.gameId).toBe(created.gameId);
    expect(found!.type).toBe("nim");
  });
});

// tests joining a game
describe("joinGame", () => {
  it("allows a second user to join a waiting game", async () => {
    const game = await createGame(userA, "nim", new Date());
    const updated = await joinGame(game.gameId, userB);
    expect(updated.players).toHaveLength(2);
    expect(updated.players.some((p) => p.username === "bob")).toBe(true);
  });

  it("throws if game id is invalid", async () => {
    await expect(joinGame("invalid-id", userB)).rejects.toThrow();
  });

  it("throws if game has already started", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    await expect(joinGame(game.gameId, userC)).rejects.toThrow("joining game that started");
  });

  it("throws if user is already in the game", async () => {
    const game = await createGame(userA, "nim", new Date());
    await expect(joinGame(game.gameId, userA)).rejects.toThrow("joining game they are in already");
  });

  it("throws if game is full", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await expect(joinGame(game.gameId, userC)).rejects.toThrow("joining full");
  });

  it("throws if non-friend tries to join a friend-only game", async () => {
    const game = await createGame(userA, "nim", new Date(), true);
    await expect(joinGame(game.gameId, userB)).rejects.toThrow("friends-only game");
  });

  it("allows a friend to join a friend-only game", async () => {
    await makeFriends(userA.userId, userB.userId);
    const game = await createGame(userA, "nim", new Date(), true);
    const updated = await joinGame(game.gameId, userB);
    expect(updated.players).toHaveLength(2);
  });

  it("allows creator to join their own friend-only game (already in)", async () => {
    const game = await createGame(userA, "nim", new Date(), true);
    await expect(joinGame(game.gameId, userA)).rejects.toThrow("joining game they are in already");
  });
});

// tests starting a game
describe("startGame", () => {
  it("starts a game with enough players", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    const views = await startGame(game.gameId, userA);
    expect(views).toBeDefined();
    expect(Object.keys(views)).toHaveLength(2);
  });

  it("throws if game id is invalid", async () => {
    await expect(startGame("invalid-id", userA)).rejects.toThrow();
  });

  it("throws if game has already started", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    await expect(startGame(game.gameId, userA)).rejects.toThrow("starting game that started");
  });

  it("throws if not enough players", async () => {
    const game = await createGame(userA, "nim", new Date());
    await expect(startGame(game.gameId, userA)).rejects.toThrow("underpopulated");
  });

  it("throws if user is not in the game", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await expect(startGame(game.gameId, userC)).rejects.toThrow("starting game they're not in");
  });
});

// tests getting games
describe("getGames", () => {
  it("returns empty array when no games exist", async () => {
    const games = await getGames();
    expect(games).toHaveLength(0);
  });

  it("returns all games in reverse chronological order", async () => {
    const first = await createGame(userA, "nim", new Date("2025-01-01"));
    const second = await createGame(userA, "guess", new Date("2025-06-01"));
    const games = await getGames();
    expect(games[0].gameId).toBe(second.gameId);
    expect(games[1].gameId).toBe(first.gameId);
  });
});

// tests viewing/spectating games
describe("viewGame", () => {
  it("throws if game id is invalid", async () => {
    await expect(viewGame("invalid-id", userA)).rejects.toThrow();
  });

  it("returns isPlayer: true for a player in the game", async () => {
    const game = await createGame(userA, "nim", new Date());
    const result = await viewGame(game.gameId, userA);
    expect(result.isPlayer).toBe(true);
  });

  it("returns isPlayer: false for a spectator", async () => {
    const game = await createGame(userA, "nim", new Date());
    const result = await viewGame(game.gameId, userB);
    expect(result.isPlayer).toBe(false);
  });

  it("returns null view before game starts", async () => {
    const game = await createGame(userA, "nim", new Date());
    const result = await viewGame(game.gameId, userA);
    expect(result.view).toBeNull();
  });

  it("returns a view after game starts", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    const result = await viewGame(game.gameId, userA);
    expect(result.view).not.toBeNull();
  });

  it("throws if non-friend tries to view a friend-only game", async () => {
    const game = await createGame(userA, "nim", new Date(), true);
    await expect(viewGame(game.gameId, userB)).rejects.toThrow("friends-only game");
  });

  it("allows a friend to view a friend-only game", async () => {
    await makeFriends(userA.userId, userB.userId);
    const game = await createGame(userA, "nim", new Date(), true);
    const result = await viewGame(game.gameId, userB);
    expect(result.isPlayer).toBe(false);
  });

  it("allows a player to view their own friend-only game", async () => {
    const game = await createGame(userA, "nim", new Date(), true);
    const result = await viewGame(game.gameId, userA);
    expect(result.isPlayer).toBe(true);
  });
});

// tests updating game
describe("updateGame", () => {
  it("throws if game id is invalid", async () => {
    await expect(updateGame("invalid-id", userA, 1)).rejects.toThrow();
  });

  it("throws if game has not started", async () => {
    const game = await createGame(userA, "nim", new Date());
    await expect(updateGame(game.gameId, userA, 1)).rejects.toThrow("hadn't started");
  });

  it("throws if user is not a player", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    await expect(updateGame(game.gameId, userC, 1)).rejects.toThrow("weren't playing");
  });

  it("throws on invalid move", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    await expect(updateGame(game.gameId, userA, 999)).rejects.toThrow("invalid move");
  });

  it("processes a valid nim move", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    const views = await updateGame(game.gameId, userA, 1);
    expect(views).toBeDefined();
  });

  it("sets winner and endedAt when game ends", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    // plays nim to completion. take all but 1, then opponent takes last
    const gameId = game.gameId;

    // force game to near-end state by playing moves
    // take 3 objects repeatedly until near end
    let current: UserWithId = userA;
    let other: UserWithId = userB;
    let remaining = 21;

    while (remaining > 1) {
      const take = Math.min(3, remaining - 1);
      try {
        await updateGame(gameId, current, take);
        remaining -= take;
        [current, other] = [other, current];
      } catch {
        break;
      }
    }

    // take the last object
    if (remaining === 1) {
      await updateGame(gameId, current, 1);
    }

    const finished = await getGameById(gameId);
    expect(finished!.status).toBe("done");
    expect(finished!.winner).toBeDefined();
  });
});

// addition update game tests to completion
describe("updateGame — game completion", () => {
  it("sets winner and endedAt when nim game ends", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    const gameId = game.gameId;

    // plays full nim game to get winner at end
    const moves: [UserWithId, number][] = [
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
    ];

    for (const [player, move] of moves) {
      await updateGame(gameId, player, move);
    }

    const finished = await getGameById(gameId);
    expect(finished!.status).toBe("done");
    expect(finished!.winner).toBeDefined();
    expect(finished!.endedAt).toBeDefined();
    // player 1 wins
    expect(finished!.winner).toBe(userB.userId);
  });

  it("sets winner correctly when player 0 wins nim", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    const gameId = game.gameId;

    // plays full nim game with player 0 winning
    const moves: [UserWithId, number][] = [
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 2],
      [userA, 3],
      [userB, 1],
    ];

    for (const [player, move] of moves) {
      await updateGame(gameId, player, move);
    }

    const finished = await getGameById(gameId);
    expect(finished!.status).toBe("done");
    expect(finished!.winner).toBe(userA.userId);
  });

  it("does not set winner twice if updateGame called after game is done", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    const gameId = game.gameId;

    const moves: [UserWithId, number][] = [
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
    ];

    for (const [player, move] of moves) {
      await updateGame(gameId, player, move);
    }

    const finished = await getGameById(gameId);
    const originalWinner = finished!.winner;

    // tests attempting move after game ending, should fail since winner is unchanged
    try {
      await updateGame(gameId, userB, 1);
    } catch {
      // expected to fail
    }

    const stillFinished = await getGameById(gameId);
    expect(stillFinished!.winner).toBe(originalWinner);
  });

  it("completes a guess game and sets winner", async () => {
    const game = await createGame(userA, "guess", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    const gameId = game.gameId;

    // guess game updates
    await updateGame(gameId, userA, 50);
    await updateGame(gameId, userB, 50);

    const finished = await getGameById(gameId);
    expect(finished!.status).toBe("done");
    expect(finished!.winner).toBeDefined();
    expect(finished!.endedAt).toBeDefined();
  });
});

// populateGameInfo endedAt/winner tests
describe("getGameById — completed game fields", () => {
  it("returns endedAt and winner on a completed game", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);

    const gameId = game.gameId;
    const moves: [UserWithId, number][] = [
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
      [userB, 3],
      [userA, 3],
    ];
    for (const [player, move] of moves) {
      await updateGame(gameId, player, move);
    }

    const finished = await getGameById(gameId);
    expect(finished!.endedAt).toBeInstanceOf(Date);
    expect(finished!.winner).toBe(userB.userId);
  });

  it("returns undefined endedAt for an unfinished game", async () => {
    const game = await createGame(userA, "nim", new Date());
    const found = await getGameById(game.gameId);
    expect(found!.endedAt).toBeUndefined();
    expect(found!.winner).toBeUndefined();
  });
});

// rematch ("replay") voting
describe("voteReplay / getReplayState", () => {
  /** Creates a 2-player nim game between A and B and plays it to completion. */
  async function finishedNimGame(): Promise<string> {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    for (let i = 0; i < 7; i += 1) {
      await updateGame(game.gameId, i % 2 === 0 ? userA : userB, 3);
    }
    return game.gameId;
  }

  it("returns null replay state for an unfinished game", async () => {
    const game = await createGame(userA, "nim", new Date());
    expect(await getReplayState(game.gameId)).toBeNull();
  });

  it("reports the required vote count once a game is finished", async () => {
    const gameId = await finishedNimGame();
    const state = await getReplayState(gameId);
    expect(state).not.toBeNull();
    expect(state!.required).toBe(2);
    expect(state!.voters).toEqual([]);
    expect(state!.replayGameId).toBeUndefined();
  });

  it("does not create a rematch until every player agrees", async () => {
    const gameId = await finishedNimGame();
    const afterFirst = await voteReplay(gameId, userA);
    expect(afterFirst.voters).toEqual(["alice"]);
    expect(afterFirst.replayGameId).toBeUndefined();
  });

  it("creates a rematch with the same players once everyone agrees", async () => {
    const gameId = await finishedNimGame();
    await voteReplay(gameId, userA);
    const afterSecond = await voteReplay(gameId, userB);

    expect(afterSecond.replayGameId).toBeDefined();
    const replay = await getGameById(afterSecond.replayGameId!);
    expect(replay!.type).toBe("nim");
    expect(replay!.status).toBe("active"); // started immediately
    expect(replay!.players.map((p) => p.username).sort()).toEqual(["alice", "bob"]);
    expect(replay!.gameId).not.toBe(gameId);
  });

  it("ignores duplicate votes from the same player", async () => {
    const gameId = await finishedNimGame();
    await voteReplay(gameId, userA);
    const again = await voteReplay(gameId, userA);
    expect(again.voters).toEqual(["alice"]);
    expect(again.replayGameId).toBeUndefined();
  });

  it("rejects a replay vote from someone who wasn't in the game", async () => {
    const gameId = await finishedNimGame();
    await expect(voteReplay(gameId, userC)).rejects.toThrow();
  });

  it("rejects replaying a game that isn't over", async () => {
    const game = await createGame(userA, "nim", new Date());
    await joinGame(game.gameId, userB);
    await startGame(game.gameId, userA);
    await expect(voteReplay(game.gameId, userA)).rejects.toThrow();
  });
});
