import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { app } from "../src/app.ts";
import { GameRepo, UserRepo } from "../src/repository.ts";
import { createUser } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";

beforeEach(async () => {
  await GameRepo.clear();
  await UserRepo.clear();
  await createUser("alice", "pwdA", new Date());
});

async function addFinishedGame(
  winner: string,
  players: string[],
  type: "nim" | "guess" | "one" = "nim",
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
    endedAt: new Date().toISOString(),
  });
}

describe("GET /api/leaderboard/list", () => {
  it("returns 200 with empty array when no games exist", async () => {
    const res = await supertest(app)
      .get("/api/leaderboard/list")
      .query({ type: "global", dateShow: "all" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 400 for invalid leaderboard type", async () => {
    const res = await supertest(app)
      .get("/api/leaderboard/list")
      .query({ type: "invalid", dateShow: "all" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid dateShow value", async () => {
    const res = await supertest(app)
      .get("/api/leaderboard/list")
      .query({ type: "global", dateShow: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns leaderboard rows for global type", async () => {
    const userId = (await getUserByUsername("alice"))!.userId;
    await addFinishedGame(userId, [userId]);

    const res = await supertest(app)
      .get("/api/leaderboard/list")
      .query({ type: "global", dateShow: "all" });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({
      rank: expect.any(Number),
      status: expect.any(String),
      totalGames: expect.any(Number),
      totalWins: expect.any(Number),
      rankPoints: expect.any(Number),
    });
  });

  it("returns leaderboard rows for nim type", async () => {
    const userId = (await getUserByUsername("alice"))!.userId;
    await addFinishedGame(userId, [userId], "nim");

    const res = await supertest(app)
      .get("/api/leaderboard/list")
      .query({ type: "nim", dateShow: "all" });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns empty array for daily filter when no games today", async () => {
    const userId = (await getUserByUsername("alice"))!.userId;
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2);
    await GameRepo.add({
      type: "nim",
      done: true,
      chat: "chat1",
      createdAt: oldDate.toISOString(),
      createdBy: userId,
      players: [userId],
      winner: userId,
      state: {},
      endedAt: oldDate.toISOString(),
    });

    const res = await supertest(app)
      .get("/api/leaderboard/list")
      .query({ type: "global", dateShow: "daily" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
