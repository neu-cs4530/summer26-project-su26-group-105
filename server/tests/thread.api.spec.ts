import { describe, expect, it } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import { randomUUID } from "node:crypto";

let response: Response;

const baseUser = {
  bio: expect.any(String),
  createdAt: expect.any(String),
  image: null,
  socialMedias: [],
  settings: {
    receivesFriendRequestNotifications: true,
    receivesFriendAcceptedNotifications: true,
    receivesGameInviteNotifications: true,
    receivesFriendGameActivityNotifications: true,
  },
};
const auth1 = { username: "user1", password: "pwd1111" };
const user1 = {
  username: "user1",
  display: "Yāo",
  ...baseUser,
};
const auth2 = { username: "user2", password: "pwd2222" };
const user2 = {
  username: "user2",
  display: "Sénior Dos",
  ...baseUser,
};

describe("GET /api/thread/list", () => {
  it("should return all threads", async () => {
    response = await supertest(app).get("/api/thread/list");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(5);
  });

  it("should return the most recent thread first", async () => {
    response = await supertest(app).get("/api/thread/list");
    expect(response.status).toBe(200);
    expect(response.body[0]).toStrictEqual({
      threadId: "abadcafeabadcafeabadcafe",
      comments: 0,
      createdAt: expect.anything(),
      title: "Nim?",
      createdBy: user1,
    });
  });
});

describe("GET /api/thread/:id", () => {
  it("should return 404 on a bad id", async () => {
    response = await supertest(app).get(`/api/thread/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should return existing ids", async () => {
    response = await supertest(app).get(`/api/thread/deadbeefdeadbeefdeadbeef`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      threadId: "deadbeefdeadbeefdeadbeef",
      title: "Hello game knights",
      text: "I'm a big Nim buff and am excited to join this community.",
      comments: [],
      createdBy: user1,
      createdAt: new Date("2025-04-02").toISOString(),
    });
  });
});

describe("POST /api/thread/create", () => {
  it("should return 400 on ill-formed payload", async () => {
    response = await supertest(app).post(`/api/thread/create`).send({ auth1 });
    expect(response.status).toBe(400);
  });

  it("should return 403 with bad auth", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .send({
        auth: { ...auth1, password: "no" },
        payload: { title: "Evil title", text: "Evil contents" },
      });
    expect(response.status).toBe(403);
  });

  it("should succeed with correct information", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .send({ auth: auth2, payload: { title: "Title", text: "Text" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      threadId: expect.anything(),
      title: "Title",
      text: "Text",
      createdAt: expect.anything(),
      createdBy: user2,
      comments: [],
    });
  });
});

describe("POST /api/thread/:id/comment", () => {
  const comment = { auth: auth2, payload: "FIRST!" };

  it("should return 400 on on ill-formed payload", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send({ auth: auth1, payload: 4 });
    expect(response.status).toBe(400);
  });

  it("should return 404 on a bad id", async () => {
    response = await supertest(app)
      .post(`/api/thread/${randomUUID().toString()}/comment`)
      .send(comment);
    expect(response.status).toBe(404);
  });

  it("should return 403 with bad auth", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send({ ...comment, auth: { ...auth1, username: "user1", password: "no" } });
    expect(response.status).toBe(403);
  });

  it("should succeed with correct information", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send(comment);
    expect(response.status).toBe(200);
    expect(response.body?.comments).toStrictEqual([
      {
        commentId: expect.anything(),
        createdAt: expect.anything(),
        text: "FIRST!",
        createdBy: user2,
      },
    ]);
  });
});
