import { describe, it, expect, beforeEach } from "vitest";
import {
  createTournament,
  joinTournament,
  advanceTournament,
  getTournamentById,
  getTournaments,
  partitionIntoMatches,
} from "../../src/services/tournament.service.ts";
import { joinGame, updateGame } from "../../src/services/game.service.ts";
import type { GameInfo } from "@gamenite/shared";
import { isPowerOf, validBracketSizes } from "@gamenite/shared";
import { FriendRepo, GameRepo, UserRepo, ChatRepo, TournamentRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { sendFriendRequest, acceptFriendRequest } from "../../src/services/friend.service.ts";
import type { UserWithId } from "../../src/types.ts";

let userA: UserWithId;
let userB: UserWithId;
let userC: UserWithId;
let userD: UserWithId;
let usersByName: Record<string, UserWithId>;

beforeEach(async () => {
  await GameRepo.clear();
  await UserRepo.clear();
  await FriendRepo.clear();
  await ChatRepo.clear();
  await TournamentRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());
  await createUser("catherine", "pwdC", new Date());
  await createUser("dave", "pwdD", new Date());

  const aAuth = await getUserByUsername("alice");
  const bAuth = await getUserByUsername("bob");
  const cAuth = await getUserByUsername("catherine");
  const dAuth = await getUserByUsername("dave");

  userA = { userId: aAuth!.userId, username: "alice" };
  userB = { userId: bAuth!.userId, username: "bob" };
  userC = { userId: cAuth!.userId, username: "catherine" };
  userD = { userId: dAuth!.userId, username: "dave" };
  usersByName = { alice: userA, bob: userB, catherine: userC, dave: userD };
});

async function makeFriends(fromId: string, toId: string) {
  const { friendId } = (await sendFriendRequest(fromId, toId)) as { friendId: string };
  await acceptFriendRequest(friendId, toId);
}

/**
 * Plays a 2-player nim match to completion. With a starting pile of 21 and both
 * players always removing the maximum of 3, the first player (index 0) is
 * forced to take the last object and loses, so the second player (index 1) wins.
 */
async function playNimMatch(match: GameInfo): Promise<UserWithId> {
  const players = match.players.map((p) => usersByName[p.username]);
  for (let i = 0; i < 7; i += 1) {
    await updateGame(match.gameId, players[i % 2], 3);
  }
  return players[1];
}

describe("bracket math helpers", () => {
  it("isPowerOf recognizes exact powers", () => {
    expect(isPowerOf(4, 2)).toBe(true);
    expect(isPowerOf(8, 2)).toBe(true);
    expect(isPowerOf(16, 2)).toBe(true);
    expect(isPowerOf(9, 3)).toBe(true);
    expect(isPowerOf(6, 2)).toBe(false);
    expect(isPowerOf(2, 2)).toBe(true);
    expect(isPowerOf(1, 2)).toBe(false);
  });

  it("validBracketSizes lists powers from gameSize^2 up to the cap", () => {
    expect(validBracketSizes(2)).toEqual([4, 8, 16, 32, 64]);
    expect(validBracketSizes(3)).toEqual([9, 27]);
    expect(validBracketSizes(4)).toEqual([16, 64]);
  });

  it("partitionIntoMatches splits players into even groups", () => {
    expect(partitionIntoMatches(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(partitionIntoMatches(["a", "b", "c"], 3)).toEqual([["a", "b", "c"]]);
  });
});

describe("createTournament", () => {
  it("creates a tournament in the registering state with the creator registered", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    expect(t.status).toBe("registering");
    expect(t.type).toBe("nim");
    expect(t.gameSize).toBe(2);
    expect(t.bracketSize).toBe(4);
    expect(t.participants).toHaveLength(1);
    expect(t.participants[0].username).toBe("alice");
    expect(t.rounds).toHaveLength(0);
  });

  it("rejects a bracket size that is not a power of the game size", async () => {
    await expect(createTournament(userA, "nim", 2, 6, false, new Date())).rejects.toThrow();
  });

  it("rejects a game size larger than the game type's max", async () => {
    // nim only allows 2 players per match
    await expect(createTournament(userA, "nim", 3, 9, false, new Date())).rejects.toThrow();
  });
});

describe("joinTournament", () => {
  it("rejects joining the same tournament twice", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    await expect(joinTournament(t.tournamentId, userA)).rejects.toThrow();
  });

  it("launches the first round once the bracket fills", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    await joinTournament(t.tournamentId, userB);
    await joinTournament(t.tournamentId, userC);
    const full = await joinTournament(t.tournamentId, userD);

    expect(full.status).toBe("active");
    expect(full.rounds).toHaveLength(1);
    expect(full.rounds[0]).toHaveLength(2); // 4 players / 2 per match
    for (const match of full.rounds[0]) {
      expect(match.players).toHaveLength(2);
      expect(match.status).toBe("active"); // matches start immediately
      expect(match.tournamentId).toBe(t.tournamentId);
    }
  });

  it("rejects joining after registration has closed", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    await joinTournament(t.tournamentId, userB);
    await joinTournament(t.tournamentId, userC);
    await joinTournament(t.tournamentId, userD); // fills the bracket
    await createUser("erin", "pwdE", new Date());
    const eAuth = await getUserByUsername("erin");
    const userE = { userId: eAuth!.userId, username: "erin" };
    await expect(joinTournament(t.tournamentId, userE)).rejects.toThrow();
  });

  it("enforces friends-only registration", async () => {
    const t = await createTournament(userA, "nim", 2, 4, true, new Date());
    // bob is not alice's friend
    await expect(joinTournament(t.tournamentId, userB)).rejects.toThrow();
    // catherine is
    await makeFriends(userA.userId, userC.userId);
    const joined = await joinTournament(t.tournamentId, userC);
    expect(joined.participants.some((p) => p.username === "catherine")).toBe(true);
  });
});

describe("tournament matches cannot be joined directly", () => {
  it("rejects joinGame on a tournament match", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    await joinTournament(t.tournamentId, userB);
    await joinTournament(t.tournamentId, userC);
    const full = await joinTournament(t.tournamentId, userD);
    const matchId = full.rounds[0][0].gameId;
    await expect(joinGame(matchId, userC)).rejects.toThrow(/tournament/i);
  });
});

describe("advanceTournament", () => {
  it("waits for every match in a round before advancing", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    await joinTournament(t.tournamentId, userB);
    await joinTournament(t.tournamentId, userC);
    const full = await joinTournament(t.tournamentId, userD);

    // finish only the first match
    await playNimMatch(full.rounds[0][0]);
    const after = await advanceTournament(t.tournamentId);

    // the round is not complete, so no new round is created yet
    expect(after!.status).toBe("active");
    expect(after!.rounds).toHaveLength(1);
  });

  it("creates the next round and then crowns a champion", async () => {
    const t = await createTournament(userA, "nim", 2, 4, false, new Date());
    await joinTournament(t.tournamentId, userB);
    await joinTournament(t.tournamentId, userC);
    const full = await joinTournament(t.tournamentId, userD);

    // play both first-round matches; index-1 player wins each
    const winner0 = await playNimMatch(full.rounds[0][0]);
    await advanceTournament(t.tournamentId);
    const winner1 = await playNimMatch(full.rounds[0][1]);
    const afterRound1 = await advanceTournament(t.tournamentId);

    expect(afterRound1!.rounds).toHaveLength(2);
    expect(afterRound1!.rounds[1]).toHaveLength(1); // one final match
    const final = afterRound1!.rounds[1][0];
    expect(final.players.map((p) => p.username).sort()).toEqual(
      [winner0.username, winner1.username].sort(),
    );

    // play the final and crown the champion
    const champion = await playNimMatch(final);
    const done = await advanceTournament(t.tournamentId);

    expect(done!.status).toBe("done");
    expect(done!.champion?.username).toBe(champion.username);
  });
});

describe("getTournaments / getTournamentById", () => {
  it("returns null for an unknown tournament", async () => {
    expect(await getTournamentById("nope")).toBeNull();
  });

  it("lists created tournaments", async () => {
    await createTournament(userA, "nim", 2, 4, false, new Date());
    await createTournament(userB, "guess", 2, 4, false, new Date());
    const list = await getTournaments();
    expect(list).toHaveLength(2);
  });
});
