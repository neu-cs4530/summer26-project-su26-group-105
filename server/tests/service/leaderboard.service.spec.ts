import { describe, it, expect, beforeEach } from "vitest";
import { getLeaderboard } from "../../src/services/leaderboard.service.ts";
import { GameRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";

let userAId: string;
let userBId: string;
let userCId: string;

beforeEach(async () => {
  await GameRepo.clear();
  await UserRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());
  await createUser("catherine", "pwdC", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
  userBId = (await getUserByUsername("bob"))!.userId;
  userCId = (await getUserByUsername("catherine"))!.userId;
});

async function addFinishedGame(
  players: string[],
  winner: string,
  type: "nim" | "guess" | "one" = "nim",
  endedAt: string = new Date().toISOString(),
) {
  return GameRepo.add({
    type,
    done: true,
    chat: "chat1",
    createdAt: new Date().toISOString(),
    createdBy: players[0],
    players,
    winner,
    state: {},
    endedAt,
  });
}

// empty leaderboard
describe("getLeaderboard — empty", () => {
  it("returns empty array when no games exist", async () => {
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    expect(rows).toHaveLength(0);
  });

  it("returns empty array when games exist but none are finished", async () => {
    await GameRepo.add({
      type: "nim",
      done: false,
      chat: "chat1",
      createdAt: new Date().toISOString(),
      createdBy: userAId,
      players: [userAId, userBId],
      state: {},
    });
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    expect(rows).toHaveLength(0);
  });

  it("returns empty array when games are done but have no winner", async () => {
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
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    expect(rows).toHaveLength(0);
  });
});

// basic stats
describe("getLeaderboard — basic stats", () => {
  it("counts one game and one win correctly", async () => {
    await addFinishedGame([userAId, userBId], userAId);
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });

    const alice = rows.find((r) => r.user.username === "alice");
    const bob = rows.find((r) => r.user.username === "bob");

    expect(alice).toBeDefined();
    expect(alice!.totalGames).toBe(1);
    expect(alice!.totalWins).toBe(1);
    expect(alice!.rankPoints).toBe(10);

    expect(bob).toBeDefined();
    expect(bob!.totalGames).toBe(1);
    expect(bob!.totalWins).toBe(0);
    expect(bob!.rankPoints).toBe(0);
  });

  it("accumulates stats across multiple games", async () => {
    await addFinishedGame([userAId, userBId], userAId);
    await addFinishedGame([userAId, userBId], userAId);
    await addFinishedGame([userAId, userBId], userBId);

    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    const alice = rows.find((r) => r.user.username === "alice");
    const bob = rows.find((r) => r.user.username === "bob");

    expect(alice!.totalGames).toBe(3);
    expect(alice!.totalWins).toBe(2);
    expect(alice!.rankPoints).toBe(15);

    expect(bob!.totalGames).toBe(3);
    expect(bob!.totalWins).toBe(1);
    expect(bob!.rankPoints).toBe(10);
  });

  it("tracks gameCounts and gameWins per game type", async () => {
    await addFinishedGame([userAId, userBId], userAId, "nim");
    await addFinishedGame([userAId, userBId], userAId, "guess");
    await addFinishedGame([userAId, userBId], userBId, "nim");

    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    const alice = rows.find((r) => r.user.username === "alice");

    expect(alice!.gameCounts.nim).toBe(2);
    expect(alice!.gameCounts.guess).toBe(1);
    expect(alice!.gameWins.nim).toBe(1);
    expect(alice!.gameWins.guess).toBe(1);
  });

  it("rankPoints never go below 0", async () => {
    // Alice loses 10 games
    for (let i = 0; i < 10; i++) {
      await addFinishedGame([userAId, userBId], userBId);
    }
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    const alice = rows.find((r) => r.user.username === "alice");
    expect(alice!.rankPoints).toBe(0);
  });
});

// sorting and rankings
describe("getLeaderboard — sorting", () => {
  it("sorts by rankPoints descending", async () => {
    await addFinishedGame([userAId, userBId], userAId); // alice +10
    await addFinishedGame([userAId, userBId], userAId); // alice +10
    await addFinishedGame([userBId, userCId], userBId); // bob +10

    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    expect(rows[0].user.username).toBe("alice");
    expect(rows[1].user.username).toBe("bob");
  });

  it("breaks ties by totalWins", async () => {
    // user A and B both have 10 points
    await addFinishedGame([userAId, userBId], userAId);
    await addFinishedGame([userBId, userCId], userBId);
    // user A wins one more (but +10, -5 vs +10, -5 = same points)
    // gives A another win to break the tie
    await addFinishedGame([userAId, userCId], userAId);
    await addFinishedGame([userBId, userCId], userCId); // bob loses

    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    expect(rows[0].user.username).toBe("alice");
  });

  it("assigns correct rank numbers", async () => {
    await addFinishedGame([userAId, userBId], userAId);
    await addFinishedGame([userBId, userCId], userBId);

    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });
});

// win status
describe("getLeaderboard — win status", () => {
  it("returns Unranked for 0 points", async () => {
    await addFinishedGame([userAId, userBId], userBId);
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    const alice = rows.find((r) => r.user.username === "alice");
    expect(alice!.status).toBe("Unranked");
  });

  it("returns Bronze for 3+ points", async () => {
    // 1 win = 10 points = bronze
    await addFinishedGame([userAId, userBId], userAId);
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    const alice = rows.find((r) => r.user.username === "alice");
    expect(alice!.status).toBe("Bronze");
  });

  it("returns Silver for 100+ points", async () => {
    for (let i = 0; i < 10; i++) {
      await addFinishedGame([userAId, userBId], userAId);
    }
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "all" });
    const alice = rows.find((r) => r.user.username === "alice");
    expect(alice!.status).toBe("Silver");
  });
});

// game specific leaderboard filter
describe("getLeaderboard — game-specific filter", () => {
  it("only includes nim games on nim leaderboard", async () => {
    await addFinishedGame([userAId, userBId], userAId, "nim");
    await addFinishedGame([userBId, userCId], userBId, "guess");

    const rows = await getLeaderboard({ leaderboard: "nim", dateShow: "all" });
    expect(rows.some((r) => r.user.username === "alice")).toBe(true);
    expect(rows.some((r) => r.user.username === "catherine")).toBe(false);
  });

  it("returns empty for a game type with no finished games", async () => {
    await addFinishedGame([userAId, userBId], userAId, "nim");
    const rows = await getLeaderboard({ leaderboard: "one", dateShow: "all" });
    expect(rows).toHaveLength(0);
  });
});

// filter by date/time
describe("getLeaderboard — date filters", () => {
  it("includes today's games on daily filter", async () => {
    await addFinishedGame([userAId, userBId], userAId, "nim", new Date().toISOString());
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "daily" });
    expect(rows.some((r) => r.user.username === "alice")).toBe(true);
  });

  it("excludes old games on daily filter", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2);
    await addFinishedGame([userAId, userBId], userAId, "nim", oldDate.toISOString());
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "daily" });
    expect(rows).toHaveLength(0);
  });

  it("includes games from last 7 days on weekly filter", async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3);
    await addFinishedGame([userAId, userBId], userAId, "nim", recentDate.toISOString());
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "weekly" });
    expect(rows.some((r) => r.user.username === "alice")).toBe(true);
  });

  it("excludes games older than 7 days on weekly filter", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    await addFinishedGame([userAId, userBId], userAId, "nim", oldDate.toISOString());
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "weekly" });
    expect(rows).toHaveLength(0);
  });

  it("excludes games with no endedAt on daily/weekly filters", async () => {
    await GameRepo.add({
      type: "nim",
      done: true,
      chat: "chat1",
      createdAt: new Date().toISOString(),
      createdBy: userAId,
      players: [userAId, userBId],
      winner: userAId,
      state: {},
    });
    const rows = await getLeaderboard({ leaderboard: "global", dateShow: "daily" });
    expect(rows).toHaveLength(0);
  });
});
