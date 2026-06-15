import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";

let response: Response;

const baseUser = {
  bio: expect.any(String),
  createdAt: expect.any(String),
  image: null,
  socialMedias: [],
  isBot: false,
};
const auth3 = { username: "user3", password: "pwd3333" };
const authBad = { username: "user3", password: "user3" };
const user3 = {
  username: "user3",
  display: "Frau Drei",
  ...baseUser,
};

describe("POST /api/game/create", () => {
  it("should return 400 on ill-formed payload or invalid game key", async () => {
    response = await supertest(app).post(`/api/game/create`).send({
      auth: auth3,
      payload: 9,
    });
    expect(response.status).toBe(400);

    response = await supertest(app)
      .post(`/api/game/create`)
      .send({ auth: auth3, payload: "gameThatDoesNotExist" });
    expect(response.status).toBe(400);
  });

  it("should return 403 with bad auth", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .send({ auth: authBad, payload: { gameKey: "nim", friendOnly: false } });
    expect(response.status).toBe(403);
  });

  it("should succeed when asked to create a game of nim", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .send({
        auth: auth3,
        payload: { gameKey: "nim", friendOnly: false },
      });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      gameId: expect.anything(),
      chat: expect.anything(),
      type: "nim",
      status: "waiting",
      friendOnly: false,
      createdBy: user3,
      createdAt: expect.anything(),
      minPlayers: 2,
      maxPlayers: 2,
      players: [user3],
    });
  });
});

describe("POST /api/game/create — friend-only", () => {
  it("creates a friend-only game with friendOnly: true", async () => {
    const response = await supertest(app)
      .post("/api/game/create")
      .send({ auth: auth3, payload: { gameKey: "nim", friendOnly: true } });
    expect(response.status).toBe(200);
    expect(response.body.friendOnly).toBe(true);
  });

  it("creates a non-friend-only game by default", async () => {
    const response = await supertest(app)
      .post("/api/game/create")
      .send({ auth: auth3, payload: { gameKey: "nim", friendOnly: false } });
    expect(response.status).toBe(200);
    expect(response.body.friendOnly).toBe(false);
  });
});

describe("GET /api/game/:id", () => {
  it("should 404 given a nonexistent id", async () => {
    response = await supertest(app).get(`/api/game/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should succeed if a created game is requested", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .send({
        auth: auth3,
        payload: { gameKey: "nim", friendOnly: false },
      });
    expect(response.status).toBe(200);
    const gameInfo = response.body;

    response = await supertest(app).get(`/api/game/${gameInfo.gameId}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(gameInfo);
  });
});

describe("GET /api/game/list", () => {
  it("should return created games in reverse chronological order", async () => {
    response = await supertest(app).get(`/api/game/list`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        type: "nim",
        status: "waiting",
        players: [{ username: "user1" }],
      },
      {
        type: "guess",
        status: "active",
        players: [
          { username: "user1" },
          { username: "user0" },
          { username: "user3" },
          { username: "user2" },
        ],
      },
      {
        type: "nim",
        status: "done",
        createdAt: new Date("2025-04-21").toISOString(),
        players: [{ username: "user2" }, { username: "user3" }],
      },
    ]);
  });
});
