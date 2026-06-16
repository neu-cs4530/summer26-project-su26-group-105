import { describe, it, expect, beforeEach } from "vitest";
import { getFriendStats } from "../../src/services/friendStats.service.ts";
import { FriendRepo, UserRepo, GameRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { sendFriendRequest, acceptFriendRequest } from "../../src/services/friend.service.ts";

// helpers
let userAId: string;
let userBId: string;
let userCId: string;

beforeEach(async () => {
  await FriendRepo.clear();
  await UserRepo.clear();
  await GameRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());
  await createUser("carol", "pwdC", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
  userBId = (await getUserByUsername("bob"))!.userId;
  userCId = (await getUserByUsername("carol"))!.userId;
});

/** makes two users friends */
async function makeFriends(fromId: string, toId: string) {
  const { friendId } = (await sendFriendRequest(fromId, toId)) as { friendId: string };
  await acceptFriendRequest(friendId, toId);
}

/** adds a completed game between two users with a given winner */
async function addCompletedGame(
  players: string[],
  winner: string,
  type: "nim" | "guess" | "one" = "nim",
) {
  const gameId = await GameRepo.add({
    type,
    done: true,
    chat: "chat1",
    createdAt: new Date().toISOString(),
    createdBy: players[0],
    players,
    winner,
    state: {},
    endedAt: new Date().toISOString(),
  });
  return gameId;
}

// non-friend cases
describe("getFriendStats — non-friends", () => {
  it("returns isFriend: false when users are not friends", async () => {
    const stats = await getFriendStats("alice", "bob");
    expect(stats.isFriend).toBe(false);
    expect(stats.totalGamesPlayedTogether).toBe(0);
    expect(stats.byGame).toHaveLength(0);
  });

  it("returns isFriend: false when userA does not exist", async () => {
    const stats = await getFriendStats("nonexistent", "bob");
    expect(stats.isFriend).toBe(false);
  });

  it("returns isFriend: false when userB does not exist", async () => {
    const stats = await getFriendStats("alice", "nonexistent");
    expect(stats.isFriend).toBe(false);
  });

  it("returns zero stats even if they played games together but aren't friends", async () => {
    await addCompletedGame([userAId, userBId], userAId);
    const stats = await getFriendStats("alice", "bob");
    expect(stats.isFriend).toBe(false);
    expect(stats.totalGamesPlayedTogether).toBe(0);
  });
});

// friends with no games
describe("getFriendStats — friends, no games together", () => {
  beforeEach(async () => {
    await makeFriends(userAId, userBId);
  });

  it("returns isFriend: true with zero stats when no games played together", async () => {
    const stats = await getFriendStats("alice", "bob");
    expect(stats.isFriend).toBe(true);
    expect(stats.totalGamesPlayedTogether).toBe(0);
    expect(stats.userATotalWins).toBe(0);
    expect(stats.userBTotalWins).toBe(0);
    expect(stats.byGame).toHaveLength(0);
  });

  it("ignores games that only one of them played", async () => {
    await addCompletedGame([userAId, userCId], userAId);
    await addCompletedGame([userBId, userCId], userBId);
    const stats = await getFriendStats("alice", "bob");
    expect(stats.totalGamesPlayedTogether).toBe(0);
    expect(stats.byGame).toHaveLength(0);
  });

  it("ignores unfinished games", async () => {
    await GameRepo.add({
      type: "nim",
      done: false,
      chat: "chat1",
      createdAt: new Date().toISOString(),
      createdBy: userAId,
      players: [userAId, userBId],
      state: {},
    });
    const stats = await getFriendStats("alice", "bob");
    expect(stats.totalGamesPlayedTogether).toBe(0);
  });
});

// friends with games
describe("getFriendStats — friends with games", () => {
  beforeEach(async () => {
    await makeFriends(userAId, userBId);
  });

  it("counts one game played together", async () => {
    await addCompletedGame([userAId, userBId], userAId);
    const stats = await getFriendStats("alice", "bob");
    expect(stats.totalGamesPlayedTogether).toBe(1);
    expect(stats.userATotalWins).toBe(1);
    expect(stats.userBTotalWins).toBe(0);
  });

  it("counts multiple games played together", async () => {
    await addCompletedGame([userAId, userBId], userAId);
    await addCompletedGame([userAId, userBId], userBId);
    await addCompletedGame([userAId, userBId], userAId);
    const stats = await getFriendStats("alice", "bob");
    expect(stats.totalGamesPlayedTogether).toBe(3);
    expect(stats.userATotalWins).toBe(2);
    expect(stats.userBTotalWins).toBe(1);
  });

  it("tracks wins correctly when userB wins all games", async () => {
    await addCompletedGame([userAId, userBId], userBId);
    await addCompletedGame([userAId, userBId], userBId);
    const stats = await getFriendStats("alice", "bob");
    expect(stats.userATotalWins).toBe(0);
    expect(stats.userBTotalWins).toBe(2);
  });

  it("handles games with no winner (draw/no winner set)", async () => {
    await GameRepo.add({
      type: "nim",
      done: true,
      chat: "chat1",
      createdAt: new Date().toISOString(),
      createdBy: userAId,
      players: [userAId, userBId],
      state: {},
      endedAt: new Date().toISOString(),
    });
    const stats = await getFriendStats("alice", "bob");
    expect(stats.totalGamesPlayedTogether).toBe(1);
    expect(stats.userATotalWins).toBe(0);
    expect(stats.userBTotalWins).toBe(0);
  });

  it("breaks down stats by game type", async () => {
    await addCompletedGame([userAId, userBId], userAId, "nim");
    await addCompletedGame([userAId, userBId], userBId, "nim");
    await addCompletedGame([userAId, userBId], userAId, "guess");
    const stats = await getFriendStats("alice", "bob");

    expect(stats.byGame).toHaveLength(2);

    const nimStats = stats.byGame.find((g) => g.gameType === "nim");
    expect(nimStats).toBeDefined();
    expect(nimStats!.gamesPlayed).toBe(2);
    expect(nimStats!.userAWins).toBe(1);
    expect(nimStats!.userBWins).toBe(1);

    const guessStats = stats.byGame.find((g) => g.gameType === "guess");
    expect(guessStats).toBeDefined();
    expect(guessStats!.gamesPlayed).toBe(1);
    expect(guessStats!.userAWins).toBe(1);
    expect(guessStats!.userBWins).toBe(0);
  });

  it("only counts games where both players participated", async () => {
    // Game with A, B, and C — should still count
    await addCompletedGame([userAId, userBId, userCId], userAId);
    // Game with only A and C — should not count
    await addCompletedGame([userAId, userCId], userAId);
    const stats = await getFriendStats("alice", "bob");
    expect(stats.totalGamesPlayedTogether).toBe(1);
  });

  it("is symmetric — alice→bob gives same totals as bob→alice", async () => {
    await addCompletedGame([userAId, userBId], userAId);
    await addCompletedGame([userAId, userBId], userBId);

    const statsAB = await getFriendStats("alice", "bob");
    const statsBA = await getFriendStats("bob", "alice");

    expect(statsAB.totalGamesPlayedTogether).toBe(statsBA.totalGamesPlayedTogether);
    // userA wins from alice's perspective = userB wins from bob's perspective
    expect(statsAB.userATotalWins).toBe(statsBA.userBTotalWins);
    expect(statsAB.userBTotalWins).toBe(statsBA.userATotalWins);
  });
});
