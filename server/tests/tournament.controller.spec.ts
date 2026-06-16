import { describe, it, expect, beforeEach, vi } from "vitest";
import supertest from "supertest";
import { app } from "../src/app.ts";
import { socketWatch, socketJoin } from "../src/controllers/tournament.controller.ts";
import { ChatRepo, FriendRepo, GameRepo, TournamentRepo, UserRepo } from "../src/repository.ts";
import { createUser } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { createTournament } from "../src/services/tournament.service.ts";
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

beforeEach(async () => {
  await UserRepo.clear();
  await FriendRepo.clear();
  await GameRepo.clear();
  await ChatRepo.clear();
  await TournamentRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());

  const aAuth = await getUserByUsername("alice");
  userA = { userId: aAuth!.userId, username: "alice" };
});

// testing POST /api/tournament/create
describe("POST /api/tournament/create", () => {
  it("returns 400 for malformed payload", async () => {
    const res = await supertest(app)
      .post("/api/tournament/create")
      .send({ auth: { username: "alice", password: "pwdA" }, payload: "bad" });
    expect(res.status).toBe(400);
  });

  it("returns 403 for invalid credentials", async () => {
    const res = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: { username: "alice", password: "wrong" },
        payload: { gameKey: "nim", gameSize: 2, bracketSize: 4, friendOnly: false },
      });
    expect(res.status).toBe(403);
  });

  it("creates a tournament with valid payload", async () => {
    const res = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: { username: "alice", password: "pwdA" },
        payload: { gameKey: "nim", gameSize: 2, bracketSize: 4, friendOnly: false },
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: "nim",
      status: "registering",
      gameSize: 2,
      bracketSize: 4,
      friendOnly: false,
    });
    expect(res.body.participants).toHaveLength(1);
  });

  it("returns 400 for invalid bracket size", async () => {
    const res = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: { username: "alice", password: "pwdA" },
        payload: { gameKey: "nim", gameSize: 2, bracketSize: 3, friendOnly: false },
      });
    expect(res.status).toBe(400);
  });

  it("creates a friend-only tournament", async () => {
    const res = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: { username: "alice", password: "pwdA" },
        payload: { gameKey: "nim", gameSize: 2, bracketSize: 4, friendOnly: true },
      });
    expect(res.status).toBe(200);
    expect(res.body.friendOnly).toBe(true);
  });
});

// testing GET /api/tournament/list
describe("GET /api/tournament/list", () => {
  it("returns empty array when no tournaments exist", async () => {
    const res = await supertest(app).get("/api/tournament/list");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns created tournaments", async () => {
    await createTournament(userA, "nim", 2, 4, false, new Date());
    const res = await supertest(app).get("/api/tournament/list");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("nim");
  });
});

// testing GET /api/tournament/:id
describe("GET /api/tournament/:id", () => {
  it("returns 404 for nonexistent tournament", async () => {
    const res = await supertest(app).get("/api/tournament/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("returns tournament for valid id", async () => {
    const tournament = await createTournament(userA, "nim", 2, 4, false, new Date());
    const res = await supertest(app).get(`/api/tournament/${tournament.tournamentId}`);
    expect(res.status).toBe(200);
    expect(res.body.tournamentId).toBe(tournament.tournamentId);
  });
});

// testing socket watch for tournament updates
describe("socketWatch", () => {
  it("joins the tournament room and emits tournamentUpdated", async () => {
    const tournament = await createTournament(userA, "nim", 2, 4, false, new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: tournament.tournamentId,
    });

    expect(socket.join).toHaveBeenCalledWith(`tournament-${tournament.tournamentId}`);
    expect(socket.emit).toHaveBeenCalledWith(
      "tournamentUpdated",
      expect.objectContaining({ tournamentId: tournament.tournamentId }),
    );
  });

  it("emits tournamentError for invalid tournament id", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: "nonexistent-id",
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "tournamentError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("emits tournamentError on bad auth", async () => {
    const tournament = await createTournament(userA, "nim", 2, 4, false, new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketWatch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: tournament.tournamentId,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "tournamentError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });
});

// testing socket join tournaments
describe("socketJoin", () => {
  it("registers user and emits tournamentUpdated to room", async () => {
    const tournament = await createTournament(userA, "nim", 2, 4, false, new Date());
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketJoin(
      socket,
      io,
    )({
      auth: { username: "bob", password: "pwdB" },
      payload: tournament.tournamentId,
    });

    expect(toChain.emit).toHaveBeenCalledWith(
      "tournamentUpdated",
      expect.objectContaining({ tournamentId: tournament.tournamentId }),
    );
  });

  it("emits tournamentError on bad auth", async () => {
    const tournament = await createTournament(userA, "nim", 2, 4, false, new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketJoin(
      socket,
      io,
    )({
      auth: { username: "bob", password: "wrong" },
      payload: tournament.tournamentId,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "tournamentError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("emits tournamentError when joining invalid tournament", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketJoin(
      socket,
      io,
    )({
      auth: { username: "bob", password: "pwdB" },
      payload: "nonexistent-id",
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "tournamentError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("emits tournamentError when user already registered", async () => {
    const tournament = await createTournament(userA, "nim", 2, 4, false, new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketJoin(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: tournament.tournamentId,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "tournamentError",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });
});
